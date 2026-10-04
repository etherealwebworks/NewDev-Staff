import Avatar from "../ui/Avatar";

/** Assigned staff: one name with avatar, or stacked avatars + "Arun +2". */
export default function StaffChips({ staff = [] }) {
  if (!staff.length) return <span className="text-xs text-text-muted">Unassigned</span>;
  const [first, ...rest] = staff;
  return (
    <div className="flex items-center gap-2" title={staff.map((s) => s.full_name).join(", ")}>
      <div className="flex -space-x-2">
        {staff.slice(0, 3).map((s) => (
          <Avatar key={s.id} name={s.full_name} src={s.avatar_url} size="sm" className="ring-2 ring-paper" />
        ))}
      </div>
      <span className="truncate text-sm text-text-dark">
        {first.full_name}
        {rest.length > 0 && <span className="text-text-muted"> +{rest.length}</span>}
      </span>
    </div>
  );
}
