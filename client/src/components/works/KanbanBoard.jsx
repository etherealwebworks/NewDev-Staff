import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Eye } from "lucide-react";
import { WORK_STATUSES, labelOf } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import ActionMenu from "../ui/ActionMenu";
import DueBadge from "../ui/DueBadge";
import PriorityBadge from "../ui/PriorityBadge";
import ProgressBar from "../ui/ProgressBar";
import StaffChips from "./StaffChips";

const COLUMNS = ["pending", "assigned", "in_progress", "on_hold", "completed"];
const HEAD = {
  pending: "bg-text-muted", assigned: "bg-info", in_progress: "bg-primary", on_hold: "bg-warning", completed: "bg-success",
};

function Card({ work: w, onMove, onOpen, onDragStart, dragging }) {
  const menu = [
    { label: "View details", icon: Eye, onClick: () => onOpen(w.id) },
    ...COLUMNS.filter((s) => s !== w.status).map((s) => ({ label: `Move to ${labelOf(WORK_STATUSES, s)}`, onClick: () => onMove(w.id, s) })),
  ];
  return (
    <article draggable onDragStart={(e) => onDragStart(e, w.id)} onDragEnd={() => onDragStart(null)}
      className={`cursor-grab rounded-xl border bg-paper p-3.5 shadow-sm transition active:cursor-grabbing ${dragging ? "opacity-40" : ""} ${w.is_overdue ? "border-danger/40" : "border-border-muted"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/admin/works/${w.id}`} className="block truncate text-sm font-semibold text-text-dark hover:text-primary">{w.title}</Link>
          <p className="truncate text-xs text-text-muted">{w.client?.company_name || w.client?.name}</p>
        </div>
        <div className="-mr-1.5 -mt-1.5"><ActionMenu items={menu} label={`Move or open ${w.title}`} /></div>
      </div>

      <div className="mt-3"><StaffChips staff={w.staff} /></div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <PriorityBadge priority={w.priority} />
        <span className={`inline-flex items-center gap-1 text-xs ${w.is_overdue ? "font-medium text-danger" : "text-text-muted"}`}>
          <CalendarDays size={12} />{w.deadline ? formatDate(w.deadline) : "No deadline"}
        </span>
        <DueBadge label={w.due_label} />
      </div>

      <div className="mt-3"><ProgressBar value={w.progress} size="sm" /></div>
    </article>
  );
}

/**
 * Drag a card to another column to change its status (mouse), or use the card's
 * menu (touch and keyboard). The parent owns the optimistic update.
 */
export default function KanbanBoard({ works, onMove, onOpen }) {
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);

  const startDrag = (e, id) => {
    if (!e) return setDragId(null);                 // drag ended
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDragId(id);
  };

  const drop = (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setOver(null); setDragId(null);
    const w = works.find((x) => x.id === id);
    if (w && w.status !== status) onMove(id, status);
  };

  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-5 xl:overflow-visible">
      {COLUMNS.map((status) => {
        const items = works.filter((w) => w.status === status);
        return (
          <section key={status} aria-label={labelOf(WORK_STATUSES, status)}
            onDragOver={(e) => { e.preventDefault(); setOver(status); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
            onDrop={(e) => drop(e, status)}
            className={`w-72 shrink-0 snap-start rounded-2xl border p-2.5 transition xl:w-auto ${over === status ? "border-primary bg-primary/5" : "border-border-muted bg-paper-off/70"}`}>
            <header className="mb-2.5 flex items-center justify-between px-1.5 pt-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-dark">
                <span className={`h-2 w-2 rounded-full ${HEAD[status]}`} />{labelOf(WORK_STATUSES, status)}
              </h3>
              <span className="rounded-full bg-text-muted/10 px-2 py-0.5 text-xs tabular-nums text-text-muted">{items.length}</span>
            </header>
            <div className="min-h-24 space-y-2.5">
              {items.map((w) => <Card key={w.id} work={w} onMove={onMove} onOpen={onOpen} onDragStart={startDrag} dragging={dragId === w.id} />)}
              {items.length === 0 && <p className="rounded-xl border border-dashed border-border-muted px-3 py-6 text-center text-xs text-text-muted">No works</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
