import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import useDebounce from "../../hooks/useDebounce";
import { inputClass } from "../../lib/ui";

/** Typing updates instantly; onChange fires 300 ms after the last keystroke. */
export default function SearchBar({ value = "", onChange, placeholder = "Search…", delay = 300, className = "" }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, delay);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (debounced !== lastEmitted.current) {
      lastEmitted.current = debounced;
      onChange?.(debounced);
    }
  }, [debounced, onChange]);

  // Allow the parent to reset the box (e.g. "Clear filters").
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value);
    }
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputClass} pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden`}
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-dark"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
