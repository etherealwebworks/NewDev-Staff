import { initials } from "../../lib/format";

const SIZES = { xs: "h-5 w-5 text-[9px]", sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-14 w-14 text-base", xl: "h-20 w-20 text-xl" };

export default function Avatar({ name, src, size = "md", className = "" }) {
  const sizeClass = SIZES[size] || SIZES.md;
  if (src) {
    return <img src={src} alt={name || "Avatar"} className={`${sizeClass} shrink-0 rounded-full border border-border-muted object-cover ${className}`} />;
  }
  return (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-border-muted bg-primary/10 font-medium text-primary ${className}`}>
      {initials(name)}
    </span>
  );
}
