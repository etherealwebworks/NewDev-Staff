import { ChevronDown } from "lucide-react";
import { inputClass } from "../../lib/ui";

/** Native <select> on purpose: it gets the OS picker on phones. */
export default function FilterDropdown({ label, value, onChange, options, allLabel = "All", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={label}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} appearance-none pr-9 ${value ? "" : "text-text-muted"}`}
      >
        <option value="">{label ? `${label}: ${allLabel}` : allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
    </div>
  );
}
