import path from "node:path";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // matches the CHECK on work_attachments.size_bytes
export const MAX_FILES_PER_WORK = 25;

const startsWith = (buf, ...bytes) => bytes.every((b, i) => buf[i] === b);
const ascii = (buf, from, text) => buf.subarray(from, from + text.length).toString("latin1") === text;
const noNulBytes = (buf) => !buf.subarray(0, 4096).includes(0);
const zipLike = (buf) => startsWith(buf, 0x50, 0x4b); // "PK": zip, docx, xlsx, pptx

const OOXML = "application/vnd.openxmlformats-officedocument";

// Deliberately small allow-list. SVG and HTML are excluded on purpose (script-bearing).
// The type is decided by extension AND content, never by the client-supplied MIME type alone.
export const ALLOWED_TYPES = {
  pdf: { mimes: ["application/pdf"], check: (b) => ascii(b, 0, "%PDF") },
  png: { mimes: ["image/png"], check: (b) => startsWith(b, 0x89, 0x50, 0x4e, 0x47) },
  jpg: { mimes: ["image/jpeg"], check: (b) => startsWith(b, 0xff, 0xd8, 0xff) },
  jpeg: { mimes: ["image/jpeg"], check: (b) => startsWith(b, 0xff, 0xd8, 0xff) },
  gif: { mimes: ["image/gif"], check: (b) => ascii(b, 0, "GIF8") },
  webp: { mimes: ["image/webp"], check: (b) => ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP") },
  docx: { mimes: [`${OOXML}.wordprocessingml.document`], check: zipLike },
  xlsx: { mimes: [`${OOXML}.spreadsheetml.sheet`], check: zipLike },
  pptx: { mimes: [`${OOXML}.presentationml.presentation`], check: zipLike },
  zip: { mimes: ["application/zip", "application/x-zip-compressed"], check: zipLike },
  txt: { mimes: ["text/plain"], check: noNulBytes },
  csv: { mimes: ["text/csv", "application/vnd.ms-excel", "text/plain"], check: noNulBytes },
};

export const ACCEPT_ATTR = Object.keys(ALLOWED_TYPES).map((e) => `.${e}`).join(",");

/** Strips any path, replaces unsafe characters, and caps the length while keeping the extension. */
export function sanitizeFileName(name) {
  const base = path.basename(String(name || "").replace(/\\/g, "/")).normalize("NFC");
  const ext = path.extname(base).toLowerCase().replace(/[^.a-z0-9]/g, "");
  const stem = path.basename(base, path.extname(base)).replace(/[^\p{L}\p{N}._ ()-]/gu, "_").replace(/\s+/g, " ").replace(/^[.\s_]+|[\s]+$/g, "");
  const safeStem = (stem || "file").slice(0, 100);
  return `${safeStem}${ext}`;
}

/** Returns { ok: true, fileName, ext, contentType } or { ok: false, error }. */
export function validateUpload({ originalname, mimetype, buffer }) {
  if (!buffer?.length) return { ok: false, error: "The file is empty." };
  if (buffer.length > MAX_FILE_BYTES) return { ok: false, error: "File is too large (max 10 MB)." };

  const fileName = sanitizeFileName(originalname);
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const rule = ALLOWED_TYPES[ext];
  if (!rule) return { ok: false, error: "This file type isn't allowed. Use PDF, images, Office documents, text/CSV or ZIP." };

  const declared = String(mimetype || "").toLowerCase();
  if (declared && declared !== "application/octet-stream" && !rule.mimes.includes(declared)) {
    return { ok: false, error: "The file's type doesn't match its extension." };
  }
  if (!rule.check(buffer)) return { ok: false, error: "The file's contents don't match its extension." };

  return { ok: true, fileName, ext, contentType: rule.mimes[0] };
}
