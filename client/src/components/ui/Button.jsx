import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border border-border-muted bg-paper text-text-dark hover:bg-paper-off",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-text-muted hover:bg-paper-off hover:text-text-dark",
};
const SIZES = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-sm" };

export default function Button({
  variant = "primary", size = "md", loading = false, icon: Icon, className = "", children, disabled, type = "button", ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}
