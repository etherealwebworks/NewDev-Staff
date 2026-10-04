import dotenv from "dotenv";
dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  appTimezone: process.env.APP_TIMEZONE || "Asia/Kolkata",
  deadlineCheckMinutes: Number(process.env.DEADLINE_CHECK_MINUTES || 60),
  attachmentsEnabled: process.env.ATTACHMENTS_ENABLED !== "false",
  workFilesBucket: process.env.WORK_FILES_BUCKET || "work-files",
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 900000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
};
