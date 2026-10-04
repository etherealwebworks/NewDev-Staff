import { z } from "zod";

const blankToNull = (v) => (typeof v === "string" && v.trim() === "" ? null : v);
const optStr = (max) => z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());
const optUrl = z.preprocess(blankToNull, z.string().url("Enter a valid URL.").nullable().optional());
const optEmail = z.preprocess(blankToNull, z.string().email("Enter a valid email.").nullable().optional());

export const createStaffSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().email("Enter a valid email."),
  phone: optStr(30),
  job_role: optStr(80),
  department: optStr(80),
  avatar_url: optUrl,
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export const updateStaffSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120).optional(),
    phone: optStr(30),
    job_role: optStr(80),
    department: optStr(80),
    avatar_url: optUrl,
  })
  .strict();

export const statusSchema = z.object({ is_active: z.boolean() });

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required.").max(120),
  company_name: optStr(160),
  email: optEmail,
  phone: optStr(30),
  address: optStr(500),
});

export const clientUpdateSchema = clientSchema.partial().strict();

export const settingsSchema = z
  .object({
    company_name: z.string().trim().min(1).max(160).optional(),
    logo_url: optUrl,
    email: optEmail,
    phone: optStr(30),
    address: optStr(500),
    default_theme: z.enum(["light", "dark", "system"]).optional(),
  })
  .strict();
