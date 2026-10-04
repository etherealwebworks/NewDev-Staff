import { WORK_STATUSES, labelOf } from "../../lib/constants";

const TONES = {
  pending: "bg-text-muted/10 text-text-muted",
  assigned: "bg-info/10 text-info",
  in_progress: "bg-primary/10 text-primary",
  on_hold: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  cancelled: "bg-text-muted/10 text-text-muted line-through decoration-text-muted/50",
};

export default function WorkStatusBadge({ status, className = "" }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${TONES[status] || TONES.pending} ${className}`}>
      {labelOf(WORK_STATUSES, status)}
    </span>
  );
}
