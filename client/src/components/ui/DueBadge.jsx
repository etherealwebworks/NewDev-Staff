import { AlertTriangle, Clock } from "lucide-react";

const CONFIG = {
  overdue: { text: "OVERDUE", cls: "bg-danger/10 text-danger font-semibold tracking-wide", icon: AlertTriangle },
  today: { text: "Due today", cls: "bg-warning/10 text-warning", icon: Clock },
  tomorrow: { text: "Due tomorrow", cls: "bg-warning/10 text-warning", icon: Clock },
  soon: { text: "Due soon", cls: "bg-info/10 text-info", icon: Clock },
};

/** Renders nothing unless the API reports a due_label for the work. */
export default function DueBadge({ label, className = "" }) {
  const c = CONFIG[label];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-medium ${c.cls} ${className}`}>
      <Icon size={11} />
      {c.text}
    </span>
  );
}
