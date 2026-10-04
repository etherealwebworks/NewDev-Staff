export default function ActiveBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-success/10 text-success" : "bg-text-muted/10 text-text-muted"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-success" : "bg-text-muted"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
