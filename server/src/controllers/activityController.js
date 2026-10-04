import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler, isUuid, paginationMeta, parsePagination } from "../utils/helpers.js";

/** Admin-only global activity feed with optional entity/work filters. */
export const listActivity = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultSize: 25, maxSize: 100 });
  let q = supabaseAdmin
    .from("activity_logs")
    .select("id, action, entity_type, entity_id, work_id, description, created_at, actor:profiles(id, full_name, avatar_url)", { count: "exact" });
  if (req.query.entity_type) q = q.eq("entity_type", String(req.query.entity_type));
  if (isUuid(req.query.work_id)) q = q.eq("work_id", req.query.work_id);
  if (isUuid(req.query.user_id)) q = q.eq("user_id", req.query.user_id);
  const { data, count, error } = await q.order("created_at", { ascending: false }).range(pg.from, pg.to);
  if (error) throw new ApiError(500, "Could not load activity.");
  res.json({ data, pagination: paginationMeta(pg, count || 0) });
});
