import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { logActivity } from "../services/activityService.js";
import { listWorks } from "../services/workService.js";
import { asyncHandler, paginationMeta, parsePagination, sanitizeSearch } from "../utils/helpers.js";
import { clientSchema, clientUpdateSchema, statusSchema } from "../validations/peopleValidations.js";

const EMPTY = { total_works: 0, active_works: 0, pending_works: 0, in_progress_works: 0, completed_works: 0, overdue_works: 0 };

async function summaries(ids) {
  if (!ids.length) return new Map();
  const { data } = await supabaseAdmin.from("client_work_summary").select("*").in("client_id", ids);
  return new Map((data || []).map((r) => [r.client_id, r]));
}

function withCounts(client, s) {
  const c = s || EMPTY;
  return {
    ...client,
    total_works: Number(c.total_works),
    active_works: Number(c.active_works),
    pending_works: Number(c.pending_works),
    in_progress_works: Number(c.in_progress_works),
    completed_works: Number(c.completed_works),
    overdue_works: Number(c.overdue_works),
  };
}

export const listClients = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultSize: 10, maxSize: 100 });
  const q = sanitizeSearch(req.query.search);
  let query = supabaseAdmin.from("clients").select("*", { count: "exact" });
  if (q) query = query.or(`name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (req.query.status === "active") query = query.eq("is_active", true);
  if (req.query.status === "inactive") query = query.eq("is_active", false);
  const { data, count, error } = await query.order("name").range(pg.from, pg.to);
  if (error) throw new ApiError(500, "Could not load clients.");
  const sums = await summaries((data || []).map((c) => c.id));
  res.json({ data: (data || []).map((c) => withCounts(c, sums.get(c.id))), pagination: paginationMeta(pg, count || 0) });
});

/** Lightweight active-client list for dropdowns. */
export const clientOptions = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from("clients").select("id, name, company_name").eq("is_active", true).order("name");
  if (error) throw new ApiError(500, "Could not load clients.");
  res.json({ data });
});

async function getOne(id) {
  const { data, error } = await supabaseAdmin.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "Could not load client.");
  if (!data) throw new ApiError(404, "Client not found.");
  const sums = await summaries([id]);
  return withCounts(data, sums.get(id));
}

export const getClient = asyncHandler(async (req, res) => {
  const client = await getOne(req.params.id);
  const works = await listWorks({ user: req.user, filters: { sort: "deadline", pageSize: 100 }, forced: { client_id: client.id } });
  // Distinct staff across this client's works.
  const staff = new Map();
  for (const w of works.data) for (const s of w.staff) staff.set(s.id, s);
  res.json({ client, works: works.data, staff: [...staff.values()] });
});

export const createClient = asyncHandler(async (req, res) => {
  const body = clientSchema.parse(req.body);
  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert({ ...body, created_by: req.user.id })
    .select()
    .single();
  if (error) throw new ApiError(500, "Could not create client.");
  await logActivity({
    userId: req.user.id,
    action: "client.create",
    entityType: "client",
    entityId: data.id,
    description: `${req.user.full_name} added client ${data.name}`,
  });
  res.status(201).json({ client: withCounts(data) });
});

export const updateClient = asyncHandler(async (req, res) => {
  const body = clientUpdateSchema.parse(req.body);
  await getOne(req.params.id);
  const { error } = await supabaseAdmin.from("clients").update(body).eq("id", req.params.id);
  if (error) throw new ApiError(500, "Could not update client.");
  const client = await getOne(req.params.id);
  await logActivity({
    userId: req.user.id,
    action: "client.update",
    entityType: "client",
    entityId: client.id,
    description: `${req.user.full_name} updated client ${client.name}`,
  });
  res.json({ client });
});

export const setClientStatus = asyncHandler(async (req, res) => {
  const { is_active } = statusSchema.parse(req.body);
  const client = await getOne(req.params.id);
  const { error } = await supabaseAdmin.from("clients").update({ is_active }).eq("id", client.id);
  if (error) throw new ApiError(500, "Could not change client status.");
  await logActivity({
    userId: req.user.id,
    action: is_active ? "client.activate" : "client.deactivate",
    entityType: "client",
    entityId: client.id,
    description: `${req.user.full_name} ${is_active ? "activated" : "deactivated"} client ${client.name}`,
  });
  res.json({ client: await getOne(client.id) });
});

/** Hard delete only when the client has no works (FK is ON DELETE RESTRICT). */
export const deleteClient = asyncHandler(async (req, res) => {
  const client = await getOne(req.params.id);
  if (client.total_works > 0) {
    throw new ApiError(409, "This client has works on record. Deactivate the client instead of deleting.");
  }
  const { error } = await supabaseAdmin.from("clients").delete().eq("id", client.id);
  if (error) throw new ApiError(500, "Could not delete client.");
  await logActivity({
    userId: req.user.id,
    action: "client.delete",
    entityType: "client",
    description: `${req.user.full_name} deleted client ${client.name}`,
  });
  res.json({ message: "Client deleted." });
});

export const clientWorks = asyncHandler(async (req, res) => {
  res.json(await listWorks({ user: req.user, filters: req.query, forced: { client_id: req.params.id } }));
});
