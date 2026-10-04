import { z } from "zod";
import { WORK_STATUSES, WORK_PRIORITIES, STAFF_SETTABLE_STATUSES } from "../models/constants.js";

// Both helpers keep an ABSENT key absent (undefined) so partial updates like
// PUT { status } never wipe other fields; a blank or null value clears the field.
const isoDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v ? v : null));

const optionalText = (max) =>
  z.string().max(max).optional().nullable().transform((v) => (v === undefined ? undefined : v && v.trim() ? v.trim() : null));

const deadlineAfterStart = (d) => !d.start_date || !d.deadline || d.deadline >= d.start_date;

export const createWorkSchema = z
  .object({
    title: z.string().trim().min(1, "Work title is required.").max(200),
    client_id: z.string().uuid("Please select a client."),
    description: optionalText(5000),
    notes: optionalText(5000),
    priority: z.enum(WORK_PRIORITIES).default("medium"),
    status: z.enum(WORK_STATUSES).optional(),
    start_date: isoDate,
    deadline: isoDate,
    staff_ids: z.array(z.string().uuid()).min(1, "Assign at least one staff member.").max(20),
  })
  .refine(deadlineAfterStart, { message: "Deadline cannot be before the start date.", path: ["deadline"] });

export const updateWorkSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    client_id: z.string().uuid().optional(),
    description: optionalText(5000),
    notes: optionalText(5000),
    priority: z.enum(WORK_PRIORITIES).optional(),
    status: z.enum(WORK_STATUSES).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    start_date: isoDate,
    deadline: isoDate,
  })
  .strict()
  .refine(deadlineAfterStart, { message: "Deadline cannot be before the start date.", path: ["deadline"] });

export const assignSchema = z.object({
  staff_ids: z.array(z.string().uuid()).min(1, "Select at least one staff member.").max(20),
  // "add" keeps current assignees; "replace" makes staff_ids the full list (reassign).
  mode: z.enum(["add", "replace"]).default("add"),
});

// What a staff member may submit. Only these three fields are ever written
// from this route, regardless of what else is in the request body.
export const workUpdateSchema = z
  .object({
    status: z.enum(STAFF_SETTABLE_STATUSES, { message: "Choose In Progress, On Hold or Completed." }).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    comment: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.status !== undefined || d.progress !== undefined || !!d.comment, {
    message: "Provide a status, progress, or comment.",
  });
