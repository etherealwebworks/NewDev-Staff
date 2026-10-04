import { z } from "zod";
import { supabaseAdmin, supabaseAnon } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const PROFILE_FIELDS = "id, full_name, email, role, is_active, phone, avatar_url";

// Passwords are hashed (bcrypt) and JWTs are issued/verified by Supabase Auth.
// This API exchanges credentials for that session and loads the role from the
// profiles table, the only trusted source of role.
export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error || !data.session) return res.status(401).json({ error: "Invalid email or password." });

    const { data: profile } = await supabaseAdmin.from("profiles").select(PROFILE_FIELDS).eq("id", data.user.id).single();
    if (!profile) return res.status(401).json({ error: "No profile found for this account." });
    if (!profile.is_active) {
      await supabaseAdmin.auth.admin.signOut(data.session.access_token).catch(() => {});
      return res.status(403).json({ error: "This account has been deactivated." });
    }

    res.json({
      user: profile,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: "Please provide a valid email and password." });
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) throw new ApiError(400, "Missing refresh token.");
    const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token });
    if (error || !data.session) return res.status(401).json({ error: "Session could not be refreshed. Please log in again." });
    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function logout(req, res) {
  await supabaseAdmin.auth.admin.signOut(req.token).catch(() => {});
  res.json({ message: "Logged out." });
}

const passwordSchema = z.object({
  current_password: z.string().min(1, "Enter your current password."),
  new_password: z.string().min(8, "New password must be at least 8 characters.").max(128),
});

/** Lets any signed-in user change their own password. The current password is re-verified first. */
export async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = passwordSchema.parse(req.body);
    if (current_password === new_password) throw new ApiError(400, "Choose a password different from the current one.");

    const { error: verifyError } = await supabaseAnon.auth.signInWithPassword({ email: req.user.email, password: current_password });
    if (verifyError) throw new ApiError(400, "Current password is incorrect.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: new_password });
    if (error) throw new ApiError(400, "Could not update password.");
    res.json({ message: "Password updated." });
  } catch (err) {
    next(err);
  }
}
