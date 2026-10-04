import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react";
import { useUnreadCount } from "../../hooks/useNotifications";
import BrandLogo from "../ui/BrandLogo";

/** Always-dark nav chrome (both themes), so it always uses the dark-background logo. */
export default function Sidebar({ items, collapsed = false, onToggleCollapse, onNavigate, onClose, onLogout }) {
  const { data: unread = 0 } = useUnreadCount();

  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className={`flex items-center py-5 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        {!collapsed && <BrandLogo forceTheme="dark" className="h-10 w-auto" />}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white lg:block"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2" aria-label="Main navigation">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${collapsed ? "justify-center" : ""} ${
                isActive ? "bg-white font-medium text-primary" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            {!collapsed && <span className="flex-1">{label}</span>}
            {badge === "unread" && unread > 0 && (
              collapsed ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
              ) : (
                <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{unread > 99 ? "99+" : unread}</span>
              )
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <button
          onClick={onLogout}
          title={collapsed ? "Log out" : undefined}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );
}
