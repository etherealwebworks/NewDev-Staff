export default function ProgressBar({ value = 0, showLabel = true, size = "md", complete }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const done = complete ?? pct === 100;
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden rounded-full bg-text-muted/15 ${size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2"}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? "bg-success" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-text-muted">{pct}%</span>}
    </div>
  );
}
