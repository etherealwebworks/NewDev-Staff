import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { logActivity, notifyAdmins, notifyUsers } from "../services/activityService.js";
import {
  assertActiveStaff,
  getWorkDetail,
  getWorkOrThrow,
  isAssigned,
  listWorks,
  withCompletionFields,
} from "../services/workService.js";
import { removeWorkFiles } from "./attachmentsController.js";
import { asyncHandler } from "../utils/helpers.js";
import {
  assignSchema,
  createWorkSchema,
  updateWorkSchema,
  workUpdateSchema,
} from "../validations/workValidations.js";

const label = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const listWorksHandler = asyncHandler(async (req, res) => {
  res.json(await listWorks({ user: req.user, filters: req.query }));
});

export const getWork = asyncHandler(async (req, res) => {
  res.json({ work: await getWorkDetail(req.params.id, req.user) });
});

export const createWork = asyncHandler(async (req, res) => {
  const body = createWorkSchema.parse(req.body);
  const staffIds = [...new Set(body.staff_ids)];
  await assertActiveStaff(staffIds);

  const { data: client } = await supabaseAdmin.from("clients").select("id, name, is_active").eq("id", body.client_id).maybeSingle();
  if (!client) throw new ApiError(400, "Selected client does not exist.");
  if (!client.is_active) throw new ApiError(400, "Selected client is inactive.");

  const { staff_ids, ...fields } = body;
  const status = fields.status || "assigned"; // staff are being assigned, so default to Assigned
  const row = withCompletionFields({ ...fields, status }, null);

  const { data: work, error } = await supabaseAdmin
    .from("works")
    .insert({ ...row, created_by: req.user.id })
    .select("id, work_code, title")
    .single();
  if (error) throw new ApiError(500, "Could not create work.");

  const { error: assignError } = await supabaseAdmin
    .from("work_assignments")
    .insert(staffIds.map((staff_id) => ({ work_id: work.id, staff_id, assigned_by: req.user.id })));
  if (assignError) {
    await supabaseAdmin.from("works").delete().eq("id", work.id); // compensate: no half-created work
    throw new ApiError(500, "Could not assign staff to the work.");
  }

  const { data: people } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", staffIds);
  const names = (people || []).map((p) => p.full_name).join(", ");
  await logActivity({
    userId: req.user.id, action: "work.create", entityType: "work", entityId: work.id, workId: work.id,
    description: `${req.user.full_name} created work "${work.title}" for ${client.name}`,
  });
  await logActivity({
    userId: req.user.id, action: "work.assign", entityType: "work", entityId: work.id, workId: work.id,
    description: `${req.user.full_name} assigned work to ${names}`,
  });
  await notifyUsers(staffIds, {
    title: "New work assigned",
    message: `${work.work_code} · ${work.title} (${client.name})`,
    type: "work_assigned",
    workId: work.id,
  });

  res.status(201).json({ work: await getWorkOrThrow(work.id) });
});

export const updateWork = asyncHandler(async (req, res) => {
  const body = updateWorkSchema.parse(req.body);
  const existing = await getWorkOrThrow(req.params.id);
  if (!Object.keys(body).length) throw new ApiError(400, "Nothing to update.");

  const effective = { ...existing, ...body };
  if (effective.start_date && effective.deadline && effective.deadline < effective.start_date) {
    throw new ApiError(400, "Deadline cannot be before the start date.");
  }
  if (body.client_id && body.client_id !== existing.client_id) {
    const { data: c } = await supabaseAdmin.from("clients").select("id").eq("id", body.client_id).maybeSingle();
    if (!c) throw new ApiError(400, "Selected client does not exist.");
  }

  const patch = withCompletionFields(body, existing);
  const { error } = await supabaseAdmin.from("works").update(patch).eq("id", existing.id);
  if (error) throw new ApiError(500, "Could not update work.");

  const staffIds = existing.staff.map((s) => s.id);
  const who = req.user.full_name;
  const ref = `${existing.work_code} · ${existing.title}`;
  const log = (action, description) =>
    logActivity({ userId: req.user.id, action, entityType: "work", entityId: existing.id, workId: existing.id, description });

  if (body.status && body.status !== existing.status) {
    await log("work.status_change", `${who} changed status from ${label(existing.status)} to ${label(body.status)}`);
    await notifyUsers(staffIds, { title: "Work status changed", message: `${ref} is now ${label(body.status)}`, type: "status_changed", workId: existing.id });
  }
  if ("deadline" in body && body.deadline !== existing.deadline) {
    await log("work.deadline_change", `${who} changed deadline to ${body.deadline || "none"}`);
    await notifyUsers(staffIds, { title: "Work deadline changed", message: `${ref} is now due ${body.deadline || "with no deadline"}`, type: "deadline_changed", workId: existing.id });
  }
  if (body.priority && body.priority !== existing.priority) {
    await log("work.priority_change", `${who} changed priority to ${label(body.priority)}`);
  }
  const other = ["title", "description", "notes", "client_id", "start_date", "progress"].filter((k) => k in body && body[k] !== existing[k]);
  if (other.length) await log("work.update", `${who} edited work details`);

  res.json({ work: await getWorkOrThrow(existing.id) });
});

export const deleteWork = asyncHandler(async (req, res) => {
  const work = await getWorkOrThrow(req.params.id);
  // Attachment rows cascade with the work, but stored files don't, so collect their paths first.
  const { data: files } = await supabaseAdmin.from("work_attachments").select("file_path").eq("work_id", work.id);
  const { error } = await supabaseAdmin.from("works").delete().eq("id", work.id);
  if (error) throw new ApiError(500, "Could not delete work.");
  await removeWorkFiles((files || []).map((f) => f.file_path));
  await logActivity({
    userId: req.user.id, action: "work.delete", entityType: "work", entityId: work.id,
    description: `${req.user.full_name} deleted work "${work.title}" (${work.work_code})`,
  });
  await notifyUsers(work.staff.map((s) => s.id), {
    title: "Work removed", message: `${work.work_code} · ${work.title} was deleted`, type: "work_deleted",
  });
  res.json({ message: "Work deleted." });
});

/** POST /api/works/:id/assign — add staff, or replace the full list (reassign). */
export const assignStaff = asyncHandler(async (req, res) => {
  const { staff_ids, mode } = assignSchema.parse(req.body);
  const ids = [...new Set(staff_ids)];
  const work = await getWorkOrThrow(req.params.id);
  await assertActiveStaff(ids);

  const current = work.staff.map((s) => s.id);
  const toAdd = ids.filter((id) => !current.includes(id));
  const toRemove = mode === "replace" ? current.filter((id) => !ids.includes(id)) : [];

  if (toAdd.length) {
    const { error } = await supabaseAdmin
      .from("work_assignments")
      .insert(toAdd.map((staff_id) => ({ work_id: work.id, staff_id, assigned_by: req.user.id })));
    if (error) throw new ApiError(500, "Could not assign staff.");
  }
  if (toRemove.length) {
    const { error } = await supabaseAdmin.from("work_assignments").delete().eq("work_id", work.id).in("staff_id", toRemove);
    if (error) throw new ApiError(500, "Could not update assignments.");
  }
  if (work.status === "pending" && toAdd.length) {
    await supabaseAdmin.from("works").update({ status: "assigned" }).eq("id", work.id);
  }

  const { data: people } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", [...toAdd, ...toRemove]);
  const nameOf = (id) => people?.find((p) => p.id === id)?.full_name || "staff";
  const reassigned = toRemove.length > 0;
  if (toAdd.length) {
    await logActivity({
      userId: req.user.id, action: reassigned ? "work.reassign" : "work.assign", entityType: "work", entityId: work.id, workId: work.id,
      description: `${req.user.full_name} ${reassigned ? "reassigned work to" : "assigned work to"} ${toAdd.map(nameOf).join(", ")}`,
    });
  }
  if (toRemove.length) {
    await logActivity({
      userId: req.user.id, action: "work.unassign", entityType: "work", entityId: work.id, workId: work.id,
      description: `${req.user.full_name} removed ${toRemove.map(nameOf).join(", ")} from the work`,
    });
  }
  await notifyUsers(toAdd, {
    title: reassigned ? "Work reassigned to you" : "New work assigned",
    message: `${work.work_code} · ${work.title} (${work.client?.name})`,
    type: reassigned ? "work_reassigned" : "work_assigned",
    workId: work.id,
  });
  await notifyUsers(toRemove, {
    title: "Work reassigned", message: `${work.work_code} · ${work.title} was reassigned to someone else`, type: "work_reassigned",
  });

  res.json({ work: await getWorkOrThrow(work.id) });
});

export const unassignStaff = asyncHandler(async (req, res) => {
  const work = await getWorkOrThrow(req.params.id);
  const { staffId } = req.params;
  if (!work.staff.some((s) => s.id === staffId)) throw new ApiError(404, "That staff member is not assigned to this work.");
  if (work.staff.length === 1) {
    throw new ApiError(400, "A work needs at least one assigned staff member. Assign someone else first.");
  }
  const { error } = await supabaseAdmin.from("work_assignments").delete().eq("work_id", work.id).eq("staff_id", staffId);
  if (error) throw new ApiError(500, "Could not remove assignment.");
  const person = work.staff.find((s) => s.id === staffId);
  await logActivity({
    userId: req.user.id, action: "work.unassign", entityType: "work", entityId: work.id, workId: work.id,
    description: `${req.user.full_name} removed ${person.full_name} from the work`,
  });
  await notifyUsers([staffId], { title: "Work reassigned", message: `${work.work_code} · ${work.title} was reassigned`, type: "work_reassigned" });
  res.json({ work: await getWorkOrThrow(work.id) });
});

/**
 * POST /api/works/:id/updates — progress update.
 * Staff: only on works assigned to them, and only status/progress/comment are
 * ever written. Admin may also post updates.
 */
export const addWorkUpdate = asyncHandler(async (req, res) => {
  const body = workUpdateSchema.parse(req.body);
  const work = await getWorkOrThrow(req.params.id, req.user); // 404 for unassigned staff
  if (req.user.role === "staff" && !(await isAssigned(work.id, req.user.id))) {
    throw new ApiError(403, "You do not have access to this resource.");
  }
  if (["cancelled"].includes(work.status) && req.user.role === "staff") {
    throw new ApiError(409, "This work has been cancelled and can no longer be updated.");
  }

  const patch = {};
  if (body.status !== undefined) patch.status = body.status;
  if (body.progress !== undefined) patch.progress = body.progress;
  // A staff member reporting progress on an assigned/pending work implicitly starts it.
  if (patch.status === undefined && patch.progress > 0 && ["pending", "assigned"].includes(work.status)) {
    patch.status = "in_progress";
  }
  const finalPatch = withCompletionFields(patch, work);

  if (Object.keys(finalPatch).length) {
    const { error } = await supabaseAdmin.from("works").update(finalPatch).eq("id", work.id);
    if (error) throw new ApiError(500, "Could not update work.");
  }

  const { error: updateError } = await supabaseAdmin.from("work_updates").insert({
    work_id: work.id,
    staff_id: req.user.id,
    status: finalPatch.status ?? null,
    progress: finalPatch.progress ?? null,
    comment: body.comment || null,
  });
  if (updateError) throw new ApiError(500, "Could not save the update.");

  const who = req.user.full_name;
  const log = (action, description) =>
    logActivity({ userId: req.user.id, action, entityType: "work", entityId: work.id, workId: work.id, description });

  if (finalPatch.status && finalPatch.status !== work.status) {
    await log(finalPatch.status === "completed" ? "work.complete" : "work.status_change",
      finalPatch.status === "completed" ? `${who} completed work` : `${who} changed status to ${label(finalPatch.status)}`);
  }
  if (finalPatch.progress !== undefined && finalPatch.progress !== work.progress) {
    await log("work.progress", `${who} updated progress to ${finalPatch.progress}%`);
  }
  if (body.comment) await log("work.comment", `${who} added a progress update`);

  if (req.user.role === "staff") {
    const ref = `${work.work_code} · ${work.title}`;
    if (finalPatch.status === "completed" && work.status !== "completed") {
      await notifyAdmins({ title: "Work completed", message: `${who} completed ${ref}`, type: "work_completed", workId: work.id });
    } else if (finalPatch.status === "on_hold" && work.status !== "on_hold") {
      await notifyAdmins({ title: "Work put on hold", message: `${who} put ${ref} on hold`, type: "work_on_hold", workId: work.id });
    }
  }

  res.status(201).json({ work: await getWorkDetail(work.id, req.user) });
});
