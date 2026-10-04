import { Link } from "react-router-dom";

const TONES = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-text-muted/10 text-text-muted",
};

export default function DashboardCard({ label, value, icon: Icon, tone = "default", to, hint, loading }) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-text-muted">{label}</p>
        {loading ? (
          <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-text-muted/15" />
        ) : (
          <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-text-dark">{value ?? 0}</p>
        )}
        {hint && <p className="mt-1 truncate text-xs text-text-muted">{hint}</p>}
      </div>
      {Icon && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon size={18} />
        </span>
      )}
    </div>
  );
  const cls = "block rounded-2xl border border-border-muted bg-paper p-5 shadow-sm";
  return to ? (
    <Link to={to} className={`${cls} transition hover:border-primary/40 hover:shadow-md`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
