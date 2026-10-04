export const WORK_STATUSES = ["pending", "assigned", "in_progress", "on_hold", "completed", "cancelled"];
export const WORK_PRIORITIES = ["low", "medium", "high", "urgent"];
// Statuses that no longer count as active workload and can never be "overdue".
export const CLOSED_STATUSES = ["completed", "cancelled"];
export const CLOSED_STATUSES_FILTER = `(${CLOSED_STATUSES.join(",")})`;
// Statuses staff may set themselves. Admin-only: pending, assigned, cancelled.
export const STAFF_SETTABLE_STATUSES = ["in_progress", "on_hold", "completed"];
export const DUE_SOON_DAYS = 7;
