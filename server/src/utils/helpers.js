import { env } from "../config/env.js";

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Today's date (YYYY-MM-DD) in the company timezone. */
export function todayISO(tz = env.appTimezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export function parsePagination(query, { defaultSize = 10, maxSize = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(query.pageSize, 10) || defaultSize));
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

export function paginationMeta({ page, pageSize }, total) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Strips characters that have meaning inside PostgREST filter strings. */
export function sanitizeSearch(q) {
  return String(q || "").replace(/[%,()*\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
