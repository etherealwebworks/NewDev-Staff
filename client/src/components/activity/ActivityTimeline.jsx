import { Link } from "react-router-dom";
import { History } from "lucide-react";
import Avatar from "../ui/Avatar";
import EmptyState from "../ui/EmptyState";
import { formatDate } from "../../lib/format";

const dayKey = (iso) => new Date(iso).toDateString();
function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatDate(iso, { year: d.getFullYear() !== today.getFullYear() });
}
const clock = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** Entries are expected newest-first; grouped under Today / Yesterday / date headings. */
export default function ActivityTimeline({ items = [], workBase = "/admin/works", emptyText = "No activity yet." }) {
  if (!items.length) return <EmptyState icon={History} title={emptyText} compact />;

  const groups = [];
  for (const item of items) {
    const key = dayKey(item.created_at);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(item.created_at), items: [item] });
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">{g.label}</h3>
          <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border-muted">
            {g.items.map((it) => {
              const text = it.work_id ? (
                <Link to={`${workBase}/${it.work_id}`} className="hover:text-primary hover:underline">{it.description}</Link>
              ) : it.description;
              return (
                <li key={it.id} className="relative flex items-start gap-3">
                  <Avatar name={it.actor?.full_name} src={it.actor?.avatar_url} className="relative z-10 ring-4 ring-paper" />
                  <div className="min-w-0 pt-1">
                    <p className="text-sm text-text-dark">{text}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{clock(it.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
