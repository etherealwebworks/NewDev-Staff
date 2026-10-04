import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const WIDTHS = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };

/** Centered dialog on desktop; slides up as a full-width sheet on phones. */
export default function Modal({ open, onClose, title, children, size = "sm", wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className={`flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border-muted bg-paper shadow-2xl sm:rounded-2xl ${WIDTHS[wide ? "md" : size]}`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border-muted px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-text-dark">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 sm:p-6" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
