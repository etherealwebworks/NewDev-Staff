export default function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border-muted">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            value === t.value ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-dark"}`}>
          {t.label}
          {t.count !== undefined && (
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${t.danger && t.count > 0 ? "bg-danger/10 text-danger" : "bg-text-muted/10 text-text-muted"}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
