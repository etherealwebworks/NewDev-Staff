import { WORK_PRIORITIES, labelOf } from "../../lib/constants";

const DOT = { low: "bg-text-muted", medium: "bg-info", high: "bg-warning", urgent: "bg-danger" };

export default function PriorityBadge({ priority, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-text-dark ${className}`}>
      <span className={`h-2 w-2 rounded-full ${DOT[priority] || DOT.medium}`} />
      {labelOf(WORK_PRIORITIES, priority)}
    </span>
  );
}
