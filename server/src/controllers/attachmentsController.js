import crypto from "node:crypto";
import multer from "multer";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { logActivity } from "../services/activityService.js";
import { getWorkOrThrow } from "../services/workService.js";
import { MAX_FILES_PER_WORK, MAX_FILE_BYTES, validateUpload } from "../utils/fileValidation.js";
import { asyncHandler } from "../utils/helpers.js";

const storage = () => supabaseAdmin.storage.from(env.workFilesBucket);

const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 1 } }).single("file");

/** multer wrapper that turns its errors into clean API errors. */
export function receiveFile(req, res, next) {
  uploader(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return next(new ApiError(413, "File is too large (max 10 MB)."));
    return next(new ApiError(400, "Could not read the uploaded file."));
  });
}

export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!env.attachmentsEnabled) throw new ApiError(403, "File uploads are turned off.");
  const work = await getWorkOrThrow(req.params.id, req.user); // 404 for staff who aren't assigned
  if (!req.file) throw new ApiError(400, "Choose a file to upload.");

  const check = validateUpload({ originalname: req.file.originalname, mimetype: req.file.mimetype, buffer: req.file.buffer });
  if (!check.ok) throw new ApiError(400, check.error);

  const { count } = await supabaseAdmin.from("work_attachments").select("id", { count: "exact", head: true }).eq("work_id", work.id);
  if ((count || 0) >= MAX_FILES_PER_WORK) throw new ApiError(409, `This work already has ${MAX_FILES_PER_WORK} files. Delete one first.`);

  // The object key is generated server-side; the original name is only ever metadata.
  const filePath = `${work.id}/${crypto.randomUUID()}.${check.ext}`;
  const { error: uploadError } = await storage().upload(filePath, req.file.buffer, { contentType: check.contentType, upsert: false });
  if (uploadError) throw new ApiError(500, "Could not store the file. Please try again.");

  const { data, error } = await supabaseAdmin
    .from("work_attachments")
    .insert({ work_id: work.id, uploaded_by: req.user.id, file_name: check.fileName, file_path: filePath, mime_type: check.contentType, size_bytes: req.file.size })
    .select("id, file_name, mime_type, size_bytes, created_at")
    .single();
  if (error) {
    await storage().remove([filePath]).catch(() => {});
    throw new ApiError(500, "Could not save the file record.");
  }

  await logActivity({
    userId: req.user.id, action: "work.attachment_add", entityType: "work", entityId: work.id, workId: work.id,
    description: `${req.user.full_name} uploaded ${check.fileName}`,
  });
  res.status(201).json({ attachment: { ...data, uploader: { id: req.user.id, full_name: req.user.full_name } } });
});

async function getAttachment(workId, attachmentId) {
  const { data } = await supabaseAdmin.from("work_attachments").select("*").eq("id", attachmentId).eq("work_id", workId).maybeSingle();
  if (!data) throw new ApiError(404, "File not found.");
  return data;
}

/** Returns a short-lived signed URL that forces a download (never renders the file inline). */
export const downloadAttachment = asyncHandler(async (req, res) => {
  const work = await getWorkOrThrow(req.params.id, req.user);
  const file = await getAttachment(work.id, req.params.attachmentId);
  const { data, error } = await storage().createSignedUrl(file.file_path, 60, { download: file.file_name });
  if (error || !data?.signedUrl) throw new ApiError(500, "Could not prepare the download.");
  res.json({ url: data.signedUrl, file_name: file.file_name });
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  const work = await getWorkOrThrow(req.params.id, req.user);
  const file = await getAttachment(work.id, req.params.attachmentId);
  if (req.user.role !== "admin" && file.uploaded_by !== req.user.id) {
    throw new ApiError(403, "You can only delete files you uploaded.");
  }
  const { error } = await supabaseAdmin.from("work_attachments").delete().eq("id", file.id);
  if (error) throw new ApiError(500, "Could not delete the file.");
  await storage().remove([file.file_path]).catch((e) => console.error("[storage] remove failed:", e?.message));
  await logActivity({
    userId: req.user.id, action: "work.attachment_remove", entityType: "work", entityId: work.id, workId: work.id,
    description: `${req.user.full_name} removed ${file.file_name}`,
  });
  res.json({ message: "File deleted." });
});

/** Removes every stored object for a work; call after (or just before) the work row is deleted. */
export async function removeWorkFiles(paths) {
  if (!paths?.length) return;
  const { error } = await storage().remove(paths);
  if (error) console.error("[storage] cleanup failed:", error.message);
}
