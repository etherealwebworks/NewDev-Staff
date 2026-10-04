import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

/**
 * Kebab menu. The popover is position:fixed so it is never clipped by a
 * scrolling table wrapper; it closes on outside click, Escape, scroll or resize.
 */
export default function ActionMenu({ items, label = "Actions" }) {
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!pos) return undefined;
    const close = () => setPos(null);
    const onKey = (e) => e.key === "Escape" && close();
    const onDown = (e) => !e.target.closest("[data-action-menu]") && close();
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  function toggle() {
    if (pos) return setPos(null);
    const r = btn.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  if (!visible.length) return null;
  return (
    <div data-action-menu className="inline-block">
      <button ref={btn} onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos}
        className="rounded-lg p-2 text-text-muted transition hover:bg-paper-off hover:text-text-dark">
        <MoreVertical size={16} />
      </button>
      {pos && (
        <div role="menu" data-action-menu style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 min-w-44 overflow-hidden rounded-xl border border-border-muted bg-paper py-1 shadow-xl">
          {visible.map(({ label: text, icon: Icon, onClick, danger }) => (
            <button key={text} role="menuitem"
              onClick={() => { setPos(null); onClick(); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition hover:bg-paper-off ${danger ? "text-danger" : "text-text-dark"}`}>
              {Icon && <Icon size={14} />}
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
