import { Loader2 } from "lucide-react";

export default function LoadingState({ label = "Loading…", fullScreen = false }) {
  return (
    <div className={`flex items-center justify-center gap-2.5 text-sm text-text-muted ${fullScreen ? "h-screen bg-paper-off" : "py-16"}`} role="status">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}
