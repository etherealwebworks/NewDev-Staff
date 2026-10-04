import { supabaseAdmin } from "../config/supabase.js";
import { CLOSED_STATUSES_FILTER, DUE_SOON_DAYS } from "../models/constants.js";
import { flattenWork, listWorks } from "../services/workService.js";
import { addDays } from "../utils/dates.js";
import { asyncHandler, todayISO } from "../utils/helpers.js";
import { ApiError } from "../middleware/errorHandler.js";

const head = { count: "exact", head: true };

/** Builds a count query over works, optionally scoped to one staff member. */
function worksCount(staffId) {
  const q = supabaseAdmin.from("works").select(staffId ? "id, scope:work_assignments!inner(staff_id)" : "id", head);
  return staffId ? q.eq("scope.staff_id", staffId) : q;
}

async function count(q) {
  const { count: c, error } = await q;
  if (error) throw new ApiError(500, "Could not load dashboard.");
  return c || 0;
}

async function workCounts(staffId) {
  const today = todayISO();
  const soon = addDays(today, DUE_SOON_DAYS);
  const open = (q) => q.not("status", "in", CLOSED_STATUSES_FILTER);
  const [total, pending, assigned, inProgress, onHold, completed, overdue, dueToday, dueSoon] = await Promise.all([
    count(worksCount(staffId)),
    count(worksCount(staffId).eq("status", "pending")),
    count(worksCount(staffId).eq("status", "assigned")),
    count(worksCount(staffId).eq("status", "in_progress")),
    count(worksCount(staffId).eq("status", "on_hold")),
    count(worksCount(staffId).eq("status", "completed")),
    count(open(worksCount(staffId)).lt("deadline", today)),
    count(open(worksCount(staffId)).eq("deadline", today)),
    count(open(worksCount(staffId)).gt("deadline", today).lte("deadline", soon)),
  ]);
  return { total, pending, assigned, in_progress: inProgress, on_hold: onHold, completed, overdue, due_today: dueToday, due_soon: dueSoon };
}

export const dashboard = asyncHandler(async (req, res) => {
  if (req.user.role === "staff") {
    const [counts, urgent] = await Promise.all([
      workCounts(req.user.id),
      listWorks({ user: req.user, filters: { deadline: "soon", sort: "deadline", pageSize: 10 } }),
    ]);
    const [overdue, today] = await Promise.all([
      listWorks({ user: req.user, filters: { deadline: "overdue", sort: "deadline", pageSize: 10 } }),
      listWorks({ user: req.user, filters: { deadline: "today", sort: "priority", pageSize: 10 } }),
    ]);
    // "My Works" = everything not closed, matching the staff dashboard cards.
    return res.json({
      role: "staff",
      counts: { ...counts, my_works: counts.total },
      overdue_works: overdue.data,
      due_today: today.data,
      due_soon: urgent.data,
    });
  }

  const today = todayISO();
  const [counts, totalStaff, activeStaff, totalClients, activeClients, workload, upcoming, activity] = await Promise.all([
    workCounts(null),
    count(supabaseAdmin.from("staff").select("id", head)),
    count(supabaseAdmin.from("profiles").select("id", head).eq("role", "staff").eq("is_active", true)),
    count(supabaseAdmin.from("clients").select("id", head)),
    count(supabaseAdmin.from("clients").select("id", head).eq("is_active", true)),
    supabaseAdmin
      .from("staff_workload")
      .select("*, staff:staff!inner(id, job_role, profile:profiles!inner(full_name, avatar_url, is_active))")
      .order("active_works", { ascending: false })
      .limit(8),
    listWorks({ user: req.user, filters: { deadline_to: addDays(today, DUE_SOON_DAYS), status: "pending,assigned,in_progress,on_hold", sort: "deadline", pageSize: 8 } }),
    supabaseAdmin
      .from("activity_logs")
      .select("id, action, description, created_at, work_id, actor:profiles(id, full_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  res.json({
    role: "admin",
    counts: { ...counts, total_staff: totalStaff, active_staff: activeStaff, total_clients: totalClients, active_clients: activeClients },
    workload: (workload.data || []).map((r) => ({
      staff_id: r.staff_id,
      full_name: r.staff?.profile?.full_name,
      avatar_url: r.staff?.profile?.avatar_url,
      job_role: r.staff?.job_role,
      is_active: r.staff?.profile?.is_active,
      active_works: Number(r.active_works),
      completed_works: Number(r.completed_works),
      overdue_works: Number(r.overdue_works),
      avg_progress: Number(r.avg_progress),
    })),
    upcoming_deadlines: upcoming.data,
    recent_activity: activity.data || [],
  });
});

/** Calendar feed: works whose start date or deadline falls in [from, to]. */
export const calendar = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) {
    throw new ApiError(400, "Provide from and to as YYYY-MM-DD.");
  }
  const staffScope = req.user.role === "staff";
  const select = `id, work_code, title, status, priority, start_date, deadline, completed_at, client:clients(id, name)${staffScope ? ", scope:work_assignments!inner(staff_id)" : ""}`;
  let q = supabaseAdmin
    .from("works")
    .select(select)
    .or(`and(start_date.gte.${from},start_date.lte.${to}),and(deadline.gte.${from},deadline.lte.${to})`)
    .order("deadline", { ascending: true })
    .limit(500);
  if (staffScope) q = q.eq("scope.staff_id", req.user.id);
  const { data, error } = await q;
  if (error) throw new ApiError(500, "Could not load calendar.");
  res.json({ data: (data || []).map((r) => flattenWork(r)) });
});
