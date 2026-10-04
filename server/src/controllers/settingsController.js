import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { logActivity } from "../services/activityService.js";
import { asyncHandler } from "../utils/helpers.js";
import { settingsSchema } from "../validations/peopleValidations.js";

const FIELDS = "company_name, logo_url, email, phone, address, default_theme, updated_at";

export const getSettings = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from("company_settings").select(FIELDS).eq("id", 1).single();
  if (error) throw new ApiError(500, "Could not load settings.");
  res.json({ settings: { ...data, attachments_enabled: env.attachmentsEnabled } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const body = settingsSchema.parse(req.body);
  const { data, error } = await supabaseAdmin
    .from("company_settings")
    .update({ ...body, updated_by: req.user.id, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select(FIELDS)
    .single();
  if (error) throw new ApiError(500, "Could not save settings.");
  await logActivity({
    userId: req.user.id, action: "settings.update", entityType: "settings",
    description: `${req.user.full_name} updated company settings`,
  });
  res.json({ settings: data });
});
