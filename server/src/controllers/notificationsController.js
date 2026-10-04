import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler, paginationMeta, parsePagination } from "../utils/helpers.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultSize: 20, maxSize: 100 });
  let q = supabaseAdmin
    .from("notifications")
    .select("id, title, message, type, work_id, is_read, created_at", { count: "exact" })
    .eq("user_id", req.user.id);
  if (req.query.unread === "true") q = q.eq("is_read", false);
  const [list, unread] = await Promise.all([
    q.order("created_at", { ascending: false }).range(pg.from, pg.to),
    supabaseAdmin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", req.user.id).eq("is_read", false),
  ]);
  if (list.error) throw new ApiError(500, "Could not load notifications.");
  res.json({ data: list.data, unread_count: unread.count || 0, pagination: paginationMeta(pg, list.count || 0) });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const { count } = await supabaseAdmin
    .from("notifications").select("id", { count: "exact", head: true }).eq("user_id", req.user.id).eq("is_read", false);
  res.json({ unread_count: count || 0 });
});

export const markRead = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from("notifications").update({ is_read: true }).eq("id", req.params.id).eq("user_id", req.user.id);
  if (error) throw new ApiError(500, "Could not update notification.");
  res.json({ message: "Marked as read." });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from("notifications").update({ is_read: true }).eq("user_id", req.user.id).eq("is_read", false);
  if (error) throw new ApiError(500, "Could not update notifications.");
  res.json({ message: "All notifications marked as read." });
});
