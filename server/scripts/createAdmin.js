// Creates (or promotes) the first admin account.
// Usage: cd server && npm run create-admin -- you@company.com "Your Name" "a-strong-password"
import { supabaseAdmin } from "../src/config/supabase.js";

const [email, fullName, password] = process.argv.slice(2);
if (!email || !fullName || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- <email> "<full name>" "<password (8+ chars)>"');
  process.exit(1);
}

const { data: existing } = await supabaseAdmin.from("profiles").select("id, role").eq("email", email).maybeSingle();
if (existing) {
  const { error } = await supabaseAdmin.from("profiles").update({ role: "admin", is_active: true }).eq("id", existing.id);
  if (error) throw new Error(error.message);
  console.log(`${email} already existed; they are now an active admin. Password unchanged.`);
  process.exit(0);
}

const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw new Error(`Could not create the auth user: ${error.message}`);

const { error: profileError } = await supabaseAdmin
  .from("profiles")
  .insert({ id: data.user.id, email, full_name: fullName, role: "admin", is_active: true });
if (profileError) {
  await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  throw new Error(`Could not create the profile: ${profileError.message}`);
}
console.log(`Admin created: ${email}`);
