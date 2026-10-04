import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { CLOSED_STATUSES_FILTER } from "../models/constants.js";
import { addDays } from "../utils/dates.js";
import { todayISO } from "../utils/helpers.js";
import { activeAdminIds, notifyUsers } from "./activityService.js";

const WORK_SELECT = "id, work_code, title, deadline, assignments:work_assignments(staff_id)";

/**
 * Creates deadline reminders (staff: due today / due tomorrow) and overdue
 * alerts (staff + admins). dedupe_key makes each alert fire once per work/day,
 * so running this hourly never spams.
 */
export async function runDeadlineChecks() {
  const today = todayISO();
  const tomorrow = addDays(today, 1);

  const [{ data: due }, { data: overdue }] = await Promise.all([
    supabaseAdmin.from("works").select(WORK_SELECT).in("deadline", [today, tomorrow]).not("status", "in", CLOSED_STATUSES_FILTER),
    supabaseAdmin.from("works").select(WORK_SELECT).lt("deadline", today).not("status", "in", CLOSED_STATUSES_FILTER).limit(500),
  ]);

  for (const w of due || []) {
    const isToday = w.deadline === today;
    await notifyUsers(w.assignments.map((a) => a.staff_id), {
      title: isToday ? "Work due today" : "Work due tomorrow",
      message: `${w.work_code} · ${w.title}`,
      type: "deadline_approaching",
      workId: w.id,
      dedupeKey: `due:${w.id}:${w.deadline}:${isToday ? "today" : "tomorrow"}`,
    });
  }

  const admins = await activeAdminIds();
  for (const w of overdue || []) {
    const key = `overdue:${w.id}:${w.deadline}`; // once per deadline, not once per day
    const payload = { title: "Work is overdue", message: `${w.work_code} · ${w.title} (was due ${w.deadline})`, type: "work_overdue", workId: w.id, dedupeKey: key };
    await notifyUsers([...admins, ...w.assignments.map((a) => a.staff_id)], payload);
  }
}

export function startDeadlineNotifier() {
  const run = () => runDeadlineChecks().catch((e) => console.error("[deadlines] check failed:", e.message));
  run();
  const timer = setInterval(run, env.deadlineCheckMinutes * 60 * 1000);
  timer.unref();
  return timer;
}
