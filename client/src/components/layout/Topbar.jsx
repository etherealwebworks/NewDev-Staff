import { Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";
import BrandLogo from "../ui/BrandLogo";
import ThemeToggle from "../ui/ThemeToggle";
import NotificationPanel from "../notifications/NotificationPanel";

export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-border-muted bg-paper/90 px-4 py-2.5 backdrop-blur sm:px-6"
      style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
    >
      <button onClick={onMenu} aria-label="Open menu" className="rounded-lg p-2 text-text-dark hover:bg-paper-off lg:hidden">
        <Menu size={19} />
      </button>
      <BrandLogo className="h-9 w-auto lg:hidden" />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ThemeToggle className="p-2 text-text-muted" />
        <NotificationPanel />
        <div className="ml-1 hidden items-center gap-2.5 border-l border-border-muted pl-3 sm:flex">
          <Avatar name={user?.full_name} src={user?.avatar_url} />
          <div className="leading-tight">
            <p className="text-sm font-medium text-text-dark">{user?.full_name}</p>
            <p className="text-[11px] capitalize text-text-muted">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
