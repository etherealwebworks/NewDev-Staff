import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, PauseCircle, RefreshCw, Trash2 } from "lucide-react";
import { timeAgo } from "../../lib/format";

const ICONS = {
  work_assigned: ClipboardList,
  work_reassigned: RefreshCw,
  status_changed: RefreshCw,
  deadline_changed: CalendarClock,
  deadline_approaching: CalendarClock,
  work_overdue: AlertTriangle,
  work_completed: CheckCircle2,
  work_on_hold: PauseCircle,
  work_deleted: Trash2,
};
const TONES = {
  work_overdue: "bg-danger/10 text-danger",
  work_completed: "bg-success/10 text-success",
  work_on_hold: "bg-warning/10 text-warning",
  deadline_approaching: "bg-warning/10 text-warning",
};

export default function NotificationItem({ item, onClick }) {
  const Icon = ICONS[item.type] || ClipboardList;
  return (
    <button
      onClick={() => onClick(item)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-paper-off ${item.is_read ? "" : "bg-primary/[0.04]"}`}
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONES[item.type] || "bg-primary/10 text-primary"}`}>
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={`text-sm ${item.is_read ? "text-text-dark" : "font-semibold text-text-dark"}`}>{item.title}</span>
          {!item.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
        </span>
        {item.message && <span className="mt-0.5 block text-xs text-text-muted">{item.message}</span>}
        <span className="mt-1 block text-[11px] text-text-muted/80">{timeAgo(item.created_at)}</span>
      </span>
    </button>
  );
}
