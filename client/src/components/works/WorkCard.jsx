import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { formatDate } from "../../lib/format";
import DueBadge from "../ui/DueBadge";
import PriorityBadge from "../ui/PriorityBadge";
import ProgressBar from "../ui/ProgressBar";
import WorkStatusBadge from "../ui/WorkStatusBadge";

/** Touch-friendly work summary. The whole card is the link. */
export default function WorkCard({ work: w, basePath = "/staff/works", showClient = true }) {
  return (
    <Link to={`${basePath}/${w.id}`}
      className={`block rounded-2xl border bg-paper p-4 shadow-sm transition active:scale-[0.99] hover:shadow-md ${w.is_overdue ? "border-danger/40" : "border-border-muted hover:border-primary/40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-text-dark">{w.title}</h3>
          <p className="mt-0.5 truncate text-xs text-text-muted">{w.work_code}{showClient && w.client?.name ? ` · ${w.client.name}` : ""}</p>
        </div>
        <PriorityBadge priority={w.priority} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <WorkStatusBadge status={w.status} />
        <DueBadge label={w.due_label} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <span className={`inline-flex items-center gap-1.5 text-xs ${w.is_overdue ? "font-medium text-danger" : "text-text-muted"}`}>
          <CalendarDays size={13} />
          {w.deadline ? `Due ${formatDate(w.deadline, { year: true })}` : "No deadline"}
        </span>
        <div className="w-28"><ProgressBar value={w.progress} size="sm" /></div>
      </div>
    </Link>
  );
}
