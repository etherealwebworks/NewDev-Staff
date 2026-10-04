// Development seed data. Idempotent: skips anything that already exists (matched by email / client name / work title).
// Usage: cd server && npm run seed
import crypto from "node:crypto";
import { supabaseAdmin } from "../src/config/supabase.js";
import { addDays } from "../src/utils/dates.js";
import { todayISO } from "../src/utils/helpers.js";

const today = todayISO();
const d = (n) => addDays(today, n);
const password = process.env.SEED_PASSWORD || `Dev-${crypto.randomBytes(5).toString("hex")}`;
const created = [];

async function ensureUser({ email, full_name, role, phone, job_role, department }) {
  const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const id = data.user.id;
  const { error: pe } = await supabaseAdmin.from("profiles").insert({ id, email, full_name, role, phone, is_active: true });
  if (pe) throw new Error(`profile ${email}: ${pe.message}`);
  if (role === "staff") {
    const { error: se } = await supabaseAdmin.from("staff").insert({ id, job_role, department });
    if (se) throw new Error(`staff ${email}: ${se.message}`);
  }
  created.push(`${role.padEnd(5)} ${email}`);
  return id;
}

async function ensureClient(c, adminId) {
  const { data: existing } = await supabaseAdmin.from("clients").select("id").eq("name", c.name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabaseAdmin.from("clients").insert({ ...c, created_by: adminId }).select("id").single();
  if (error) throw new Error(`client ${c.name}: ${error.message}`);
  return data.id;
}

async function ensureWork(w, clientId, staffIds, adminId) {
  const { data: existing } = await supabaseAdmin.from("works").select("id").eq("title", w.title).eq("client_id", clientId).maybeSingle();
  if (existing) return;
  const completed = w.status === "completed";
  const { data, error } = await supabaseAdmin
    .from("works")
    .insert({
      title: w.title, description: w.description, client_id: clientId, priority: w.priority, status: w.status,
      progress: completed ? 100 : w.progress, start_date: w.start, deadline: w.deadline,
      completed_at: completed ? new Date().toISOString() : null, created_by: adminId,
    })
    .select("id")
    .single();
  if (error) throw new Error(`work ${w.title}: ${error.message}`);
  await supabaseAdmin.from("work_assignments").insert(staffIds.map((staff_id) => ({ work_id: data.id, staff_id, assigned_by: adminId })));
  await supabaseAdmin.from("activity_logs").insert({
    user_id: adminId, action: "work.create", entity_type: "work", entity_id: data.id, work_id: data.id,
    description: `Admin created work "${w.title}"`,
  });
}

const adminId = await ensureUser({ email: "admin@newdev.test", full_name: "NEWDEV Admin", role: "admin" });
const staff = {
  arun: await ensureUser({ email: "arun@newdev.test", full_name: "Arun Kumar", role: "staff", phone: "9000000001", job_role: "Full-Stack Developer", department: "Development" }),
  priya: await ensureUser({ email: "priya@newdev.test", full_name: "Priya", role: "staff", phone: "9000000002", job_role: "SEO Specialist", department: "Marketing" }),
  rahul: await ensureUser({ email: "rahul@newdev.test", full_name: "Rahul", role: "staff", phone: "9000000003", job_role: "UI/UX Designer", department: "Design" }),
  dinesh: await ensureUser({ email: "dinesh@newdev.test", full_name: "Dinesh", role: "staff", phone: "9000000004", job_role: "Backend Developer", department: "Development" }),
};

const abc = await ensureClient({ name: "ABC Technologies", company_name: "ABC Technologies Pvt Ltd", email: "contact@abc.test", phone: "9100000001" }, adminId);
const xyz = await ensureClient({ name: "XYZ Solutions", company_name: "XYZ Solutions", email: "hello@xyz.test", phone: "9100000002" }, adminId);
const digital = await ensureClient({ name: "Digital World", company_name: "Digital World Media", email: "team@digitalworld.test", phone: "9100000003" }, adminId);
const srm = await ensureClient({ name: "SRM Events", company_name: "SRM Events", email: "events@srm.test", phone: "9100000004" }, adminId);

// Arun holds works for ABC (x2), XYZ, and Digital World — one staff, many clients.
await ensureWork({ title: "Corporate Website", description: "Multi-page corporate site with CMS-ready sections.", priority: "high", status: "in_progress", progress: 65, start: d(-14), deadline: d(5) }, abc, [staff.arun], adminId);
await ensureWork({ title: "SEO Optimization", description: "On-page SEO audit and fixes.", priority: "medium", status: "in_progress", progress: 30, start: d(-10), deadline: d(1) }, xyz, [staff.arun, staff.priya], adminId);
await ensureWork({ title: "Landing Page", description: "Campaign landing page with lead form.", priority: "urgent", status: "assigned", progress: 0, start: d(-3), deadline: d(-1) }, digital, [staff.arun], adminId);
await ensureWork({ title: "Mobile App UI", description: "UI screens for the customer app.", priority: "medium", status: "assigned", progress: 10, start: d(-1), deadline: d(12) }, abc, [staff.arun, staff.rahul], adminId);
await ensureWork({ title: "Social Media Website", description: "Community website with feeds.", priority: "high", status: "in_progress", progress: 50, start: d(-20), deadline: d(-2) }, digital, [staff.rahul], adminId);
await ensureWork({ title: "Database Optimization", description: "Index and query tuning.", priority: "low", status: "on_hold", progress: 40, start: d(-30), deadline: d(20) }, xyz, [staff.dinesh], adminId);
await ensureWork({ title: "Event Registration Portal", description: "Symposium registration and ticketing.", priority: "high", status: "pending", progress: 0, start: d(2), deadline: d(30) }, srm, [staff.dinesh], adminId);
await ensureWork({ title: "Brand Style Guide", description: "Logo usage and colour guide.", priority: "low", status: "completed", progress: 100, start: d(-40), deadline: d(-25) }, srm, [staff.rahul], adminId);

console.log("Seed complete.");
if (created.length) {
  console.log(`\nNew accounts (password for all: ${password})`);
  created.forEach((c) => console.log("  " + c));
} else {
  console.log("All accounts already existed; passwords unchanged.");
}
