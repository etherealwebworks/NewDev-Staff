import { test } from "node:test";
import assert from "node:assert/strict";

// workService imports the Supabase client, so give it dummy credentials; these tests never touch the network.
process.env.SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_ANON_KEY ||= "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "service";
const { dueLabel, isOverdue, withCompletionFields, flattenWork, redactForRole } = await import("../src/services/workService.js");
const { createWorkSchema, workUpdateSchema, updateWorkSchema } = await import("../src/validations/workValidations.js");
const { sanitizeSearch, parsePagination } = await import("../src/utils/helpers.js");

const TODAY = "2026-10-02";
const w = (deadline, status = "in_progress") => ({ deadline, status });

test("overdue: deadline passed and not completed/cancelled", () => {
  assert.equal(isOverdue(w("2026-10-01"), TODAY), true);
  assert.equal(isOverdue(w("2026-10-01", "completed"), TODAY), false);
  assert.equal(isOverdue(w("2026-10-01", "cancelled"), TODAY), false);
  assert.equal(isOverdue(w("2026-10-02"), TODAY), false);
  assert.equal(isOverdue(w(null), TODAY), false);
});

test("due labels: overdue / today / tomorrow / soon / none", () => {
  assert.equal(dueLabel(w("2026-09-30"), TODAY), "overdue");
  assert.equal(dueLabel(w("2026-10-02"), TODAY), "today");
  assert.equal(dueLabel(w("2026-10-03"), TODAY), "tomorrow");
  assert.equal(dueLabel(w("2026-10-09"), TODAY), "soon");
  assert.equal(dueLabel(w("2026-10-10"), TODAY), null);
  assert.equal(dueLabel(w("2026-10-02", "completed"), TODAY), null);
});

test("completing a work forces 100% and stamps completed_at; reopening clears it", () => {
  const done = withCompletionFields({ status: "completed", progress: 40 }, { status: "in_progress" });
  assert.equal(done.progress, 100);
  assert.ok(done.completed_at);
  const reopened = withCompletionFields({ status: "in_progress" }, { status: "completed" });
  assert.equal(reopened.completed_at, null);
  const unchanged = withCompletionFields({ status: "completed" }, { status: "completed" });
  assert.equal("completed_at" in unchanged, false);
});

test("flattenWork exposes every assigned staff member and hides the scope alias", () => {
  const row = {
    id: "1", status: "in_progress", deadline: null, scope: [{ staff_id: "s1" }],
    assignments: [
      { assigned_at: "x", staff: { id: "s1", job_role: "Dev", profile: { full_name: "Arun" } } },
      { assigned_at: "y", staff: { id: "s2", job_role: "SEO", profile: { full_name: "Priya" } } },
    ],
  };
  const out = flattenWork(row, TODAY);
  assert.deepEqual(out.staff.map((s) => s.full_name), ["Arun", "Priya"]);
  assert.equal("scope" in out, false);
});

const id = "11111111-1111-4111-8111-111111111111";

test("createWork requires a client and at least one staff member, and rejects no billing fields", () => {
  assert.throws(() => createWorkSchema.parse({ title: "x", client_id: id, staff_ids: [] }));
  assert.throws(() => createWorkSchema.parse({ title: "x", staff_ids: [id] }));
  const ok = createWorkSchema.parse({ title: " Site ", client_id: id, staff_ids: [id], deadline: "" });
  assert.equal(ok.title, "Site");
  assert.equal(ok.deadline, null);
  assert.equal(ok.priority, "medium");
  assert.throws(() => createWorkSchema.parse({ title: "x", client_id: id, staff_ids: [id], start_date: "2026-10-05", deadline: "2026-10-01" }));
});

test("updateWork is strict: unknown fields (e.g. amount) are rejected", () => {
  assert.throws(() => updateWorkSchema.parse({ title: "x", amount: 100 }));
});

test("staff work update only allows in_progress / on_hold / completed", () => {
  assert.doesNotThrow(() => workUpdateSchema.parse({ status: "on_hold" }));
  assert.throws(() => workUpdateSchema.parse({ status: "cancelled" }));
  assert.throws(() => workUpdateSchema.parse({ status: "pending" }));
  assert.throws(() => workUpdateSchema.parse({}));
  assert.throws(() => workUpdateSchema.parse({ progress: 120 }));
});

test("search input is stripped of PostgREST filter syntax; pagination is clamped", () => {
  assert.equal(sanitizeSearch("a,b)(c%*"), "a b c");
  assert.deepEqual(parsePagination({ page: "0", pageSize: "9999" }), { page: 1, pageSize: 100, from: 0, to: 99 });
});

test("partial update keeps absent fields absent (a status-only PUT must not wipe dates or text)", () => {
  assert.deepEqual(updateWorkSchema.parse({ status: "in_progress" }), { status: "in_progress" });
  const cleared = updateWorkSchema.parse({ deadline: "", description: "  " });
  assert.equal(cleared.deadline, null);
  assert.equal(cleared.description, null);
  assert.deepEqual(Object.keys(cleared).sort(), ["deadline", "description"]);
});

test("staff never receive internal admin notes; admins do", () => {
  const work = { id: "1", title: "x", notes: "client is difficult", description: "public" };
  assert.equal("notes" in redactForRole(work, { role: "staff" }), false);
  assert.equal(redactForRole(work, { role: "staff" }).description, "public");
  assert.equal(redactForRole(work, { role: "admin" }).notes, "client is difficult");
});
