import { supabaseAdmin } from "../config/supabase.js";

/** Writes one activity-log row. Never throws: logging must not break the request. */
export async function logActivity({ userId, action, entityType, entityId = null, workId = null, description }) {
  const { error } = await supabaseAdmin.from("activity_logs").insert({
    user_id: userId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    work_id: workId,
    description,
  });
  if (error) console.error("[activity] insert failed:", error.message);
}

/** Creates notifications for a list of user ids. Skips duplicates when dedupeKey is set. */
export async function notifyUsers(userIds, { title, message = null, type, workId = null, dedupeKey = null }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return;
  const rows = ids.map((user_id) => ({
    user_id,
    title,
    message,
    type,
    work_id: workId,
    dedupe_key: dedupeKey,
  }));
  const query = dedupeKey
    ? supabaseAdmin.from("notifications").upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
    : supabaseAdmin.from("notifications").insert(rows);
  const { error } = await query;
  if (error) console.error("[notify] insert failed:", error.message);
}

export async function activeAdminIds() {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);
  return (data || []).map((r) => r.id);
}

export async function notifyAdmins(payload, { excludeUserId = null } = {}) {
  const ids = (await activeAdminIds()).filter((id) => id !== excludeUserId);
  await notifyUsers(ids, payload);
}
