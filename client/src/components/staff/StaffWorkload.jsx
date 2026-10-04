import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import Avatar from "../ui/Avatar";
import EmptyState from "../ui/EmptyState";
import ProgressBar from "../ui/ProgressBar";

const Stat = ({ label, value, danger }) => (
  <div className="text-center">
    <p className={`text-base font-semibold tabular-nums ${danger && value > 0 ? "text-danger" : "text-text-dark"}`}>{value}</p>
    <p className="text-[11px] text-text-muted">{label}</p>
  </div>
);

/** One row per staff member; click through to their profile and assigned works. */
export default function StaffWorkload({ rows = [] }) {
  if (!rows.length) return <EmptyState icon={Users} title="No staff members yet" description="Add staff to see their workload here." compact />;
  return (
    <ul className="divide-y divide-border-muted">
      {rows.map((r) => (
        <li key={r.staff_id}>
          <Link to={`/admin/staff/${r.staff_id}`} className="flex flex-col gap-3 px-4 py-3.5 transition hover:bg-paper-off/70 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={r.full_name} src={r.avatar_url} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-dark">
                  {r.full_name}
                  {!r.is_active && <span className="ml-2 text-xs font-normal text-text-muted">(inactive)</span>}
                </p>
                <p className="truncate text-xs text-text-muted">{r.job_role || "Staff"}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-6 sm:justify-end">
              <Stat label="Active" value={r.active_works} />
              <Stat label="Completed" value={r.completed_works} />
              <Stat label="Overdue" value={r.overdue_works} danger />
              <div className="hidden w-28 lg:block">
                <p className="mb-1 text-[11px] text-text-muted">Avg progress</p>
                <ProgressBar value={r.avg_progress} size="sm" />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
