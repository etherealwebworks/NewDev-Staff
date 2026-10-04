import { isUuid } from "../utils/helpers.js";

/** router.param handler: rejects malformed ids with 400 instead of a database error. */
export function uuidParam(req, res, next, value) {
  if (!isUuid(value)) return res.status(400).json({ error: "Invalid id." });
  next();
}
