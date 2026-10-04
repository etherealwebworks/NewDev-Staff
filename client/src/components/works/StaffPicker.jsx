import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { useStaffOptions } from "../../hooks/useOptions";
import Avatar from "../ui/Avatar";
import ErrorState from "../ui/ErrorState";
import LoadingState from "../ui/LoadingState";

/**
 * Multi-select of ACTIVE staff, each row showing current workload so the admin
 * can balance assignments. Rows are large tap targets for phones.
 */
export default function StaffPicker({ value, onChange, error }) {
  const q = useStaffOptions();
  const [text, setText] = useState("");
  const selected = new Set(value);

  const rows = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (q.data || []).filter((s) => !t || s.full_name.toLowerCase().includes(t) || (s.job_role || "").toLowerCase().includes(t));
  }, [q.data, text]);

  const toggle = (id) => onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);

  if (q.isLoading) return <LoadingState label="Loading staff…" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!q.data.length) return <p className="rounded-lg bg-warning/10 px-3 py-3 text-sm text-warning">No active staff yet. Add a staff member first.</p>;

  return (
    <div className={`rounded-lg border ${error ? "border-danger" : "border-border-muted"}`}>
      <div className="relative border-b border-border-muted">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search staff" aria-label="Search staff"
          className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-text-muted/70" />
      </div>
      <ul className="max-h-52 divide-y divide-border-muted overflow-y-auto" role="group" aria-label="Staff">
        {rows.length === 0 && <li className="px-3 py-4 text-center text-sm text-text-muted">No match</li>}
        {rows.map((s) => {
          const on = selected.has(s.id);
          return (
            <li key={s.id}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(s.id)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-paper-off ${on ? "bg-primary/[0.05]" : ""}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary text-on-primary" : "border-border-muted"}`}>
                  {on && <Check size={13} strokeWidth={3} />}
                </span>
                <Avatar name={s.full_name} src={s.avatar_url} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-dark">{s.full_name}</span>
                  {s.job_role && <span className="block truncate text-xs text-text-muted">{s.job_role}</span>}
                </span>
                <span className="shrink-0 text-right text-xs text-text-muted">
                  {s.active_works} active
                  {s.overdue_works > 0 && <span className="block font-medium text-danger">{s.overdue_works} overdue</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border-muted px-3 py-2 text-xs text-text-muted">{value.length} selected</p>
    </div>
  );
}
