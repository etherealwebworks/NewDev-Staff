import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { CLOSED_STATUSES, CLOSED_STATUSES_FILTER, DUE_SOON_DAYS } from "../models/constants.js";
import { addDays } from "../utils/dates.js";
import { paginationMeta, parsePagination, sanitizeSearch, todayISO } from "../utils/helpers.js";

const WORK_COLUMNS = `id, work_code, title, description, notes, priority, status, progress,
  start_date, deadline, completed_at, created_by, created_at, updated_at, client_id,
  client:clients(id, name, company_name, email, phone),
  assignments:work_assignments(id, assigned_at, staff:staff(id, job_role, department, profile:profiles(id, full_name, email, phone, avatar_url)))`;

/** Adds a scoping alias so we can filter by assigned staff without hiding co-assignees. */
const SCOPED_SELECT = `${WORK_COLUMNS}, scope:work_assignments!inner(staff_id)`;

export function isOverdue(work, today = todayISO()) {
  return !!work.deadline && work.deadline < today && !CLOSED_STATUSES.includes(work.status);
}

/** "overdue" | "today" | "tomorrow" | "soon" | null — drives the deadline badges. */
export function dueLabel(work, today = todayISO()) {
  if (!work.deadline || CLOSED_STATUSES.includes(work.status)) return null;
  if (work.deadline < today) return "overdue";
  if (work.deadline === today) return "today";
  if (work.deadline === addDays(today, 1)) return "tomorrow";
  if (work.deadline <= addDays(today, DUE_SOON_DAYS)) return "soon";
  return null;
}

/** `notes` are the admin's internal notes; staff never receive them. */
export function redactForRole(work, user) {
  if (!work || user?.role !== "staff") return work;
  const { notes, ...rest } = work; // eslint-disable-line no-unused-vars
  return rest;
}

export function flattenWork(row, today = todayISO()) {
  if (!row) return row;
  const { assignments, scope, ...rest } = row;
  const staff = (assignments || []).map((a) => ({
    id: a.staff?.id,
    full_name: a.staff?.profile?.full_name,
    email: a.staff?.profile?.email,
    phone: a.staff?.profile?.phone,
    avatar_url: a.staff?.profile?.avatar_url,
    job_role: a.staff?.job_role,
    department: a.staff?.department,
    assigned_at: a.assigned_at,
  }));
  return { ...rest, staff, is_overdue: isOverdue(row, today), due_label: dueLabel(row, today) };
}

function applyDeadlineFilter(query, deadline, today) {
  switch (deadline) {
    case "overdue":
      return query.lt("deadline", today).not("status", "in", CLOSED_STATUSES_FILTER);
    case "today":
      return query.eq("deadline", today).not("status", "in", CLOSED_STATUSES_FILTER);
    case "tomorrow":
      return query.eq("deadline", addDays(today, 1)).not("status", "in", CLOSED_STATUSES_FILTER);
    case "soon":
      return query
        .gte("deadline", today)
        .lte("deadline", addDays(today, DUE_SOON_DAYS))
        .not("status", "in", CLOSED_STATUSES_FILTER);
    case "none":
      return query.is("deadline", null);
    default:
      return query;
  }
}

/**
 * Lists works with filters/sort/pagination.
 * - Staff users are ALWAYS scoped to works assigned to them; any staff_id in
 *   the request is ignored.
 * - Admins may filter by staff_id / client_id.
 */
export async function listWorks({ user, filters = {}, forced = {} }) {
  const f = { ...filters, ...forced };
  const today = todayISO();
  const pg = parsePagination(f, { defaultSize: 10, maxSize: 100 });

  const staffScope = user.role === "staff" ? user.id : f.staff_id || null;

  let query = supabaseAdmin
    .from("works")
    .select(staffScope ? SCOPED_SELECT : WORK_COLUMNS, { count: "exact" });

  if (staffScope) query = query.eq("scope.staff_id", staffScope);
  if (f.client_id) query = query.eq("client_id", f.client_id);
  if (f.status) query = query.in("status", String(f.status).split(","));
  if (f.priority) query = query.in("priority", String(f.priority).split(","));
  if (f.deadline_from) query = query.gte("deadline", f.deadline_from);
  if (f.deadline_to) query = query.lte("deadline", f.deadline_to);
  query = applyDeadlineFilter(query, f.deadline, today);

  const q = sanitizeSearch(f.search);
  if (q) query = query.ilike("search_text", `%${q.toLowerCase()}%`);

  switch (f.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "deadline":
      query = query.order("deadline", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      break;
    case "priority": // enum order is low < medium < high < urgent
      query = query.order("priority", { ascending: false }).order("deadline", { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(pg.from, pg.to);
  if (error) throw new ApiError(500, "Could not load works.");

  return { data: (data || []).map((r) => redactForRole(flattenWork(r, today), user)), pagination: paginationMeta(pg, count || 0) };
}

export async function isAssigned(workId, staffId) {
  const { data } = await supabaseAdmin
    .from("work_assignments")
    .select("id")
    .eq("work_id", workId)
    .eq("staff_id", staffId)
    .maybeSingle();
  return !!data;
}

/** Loads one work (plain row + relations). Throws 404 — also for staff who aren't assigned, so existence isn't leaked. */
export async function getWorkOrThrow(id, user) {
  const { data, error } = await supabaseAdmin.from("works").select(WORK_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "Could not load work.");
  if (!data) throw new ApiError(404, "Work not found.");
  const work = flattenWork(data);
  if (user && user.role === "staff" && !work.staff.some((s) => s.id === user.id)) {
    throw new ApiError(404, "Work not found.");
  }
  return work;
}

/** Full detail payload: work + progress updates + attachments + activity timeline. */
export async function getWorkDetail(id, user) {
  const work = await getWorkOrThrow(id, user);
  const [updates, attachments, timeline] = await Promise.all([
    supabaseAdmin
      .from("work_updates")
      .select("id, status, progress, comment, created_at, author:profiles(id, full_name, avatar_url)")
      .eq("work_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("work_attachments")
      .select("id, file_name, mime_type, size_bytes, created_at, uploader:profiles(id, full_name)")
      .eq("work_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("activity_logs")
      .select("id, action, description, created_at, actor:profiles(id, full_name, avatar_url)")
      .eq("work_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return redactForRole({
    ...work,
    updates: updates.data || [],
    attachments: attachments.data || [],
    timeline: timeline.data || [],
  }, user);
}

/** Status side-effects: completing stamps completed_at and forces 100%; reopening clears it. */
export function withCompletionFields(patch, existing) {
  const next = { ...patch };
  if (next.status === "completed") {
    next.progress = 100;
    if (existing?.status !== "completed") next.completed_at = new Date().toISOString();
  } else if (next.status && existing?.status === "completed") {
    next.completed_at = null;
  }
  return next;
}

/** Throws unless every id is an active staff member. */
export async function assertActiveStaff(staffIds) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .in("id", staffIds)
    .eq("role", "staff")
    .eq("is_active", true);
  if (error) throw new ApiError(500, "Could not verify staff.");
  if ((data || []).length !== new Set(staffIds).size) {
    throw new ApiError(400, "One or more selected staff members are inactive or do not exist.");
  }
}
