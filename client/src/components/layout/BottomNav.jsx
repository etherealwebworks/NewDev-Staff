import { NavLink } from "react-router-dom";
import { useUnreadCount } from "../../hooks/useNotifications";

/** Phone-only tab bar so staff reach their works in one tap (the drawer stays for everything else). */
export default function BottomNav({ items }) {
  const { data: unread = 0 } = useUnreadCount();
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border-muted bg-paper/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ to, short, label, icon: Icon, end, badge }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} end={end}
              className={({ isActive }) => `relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${isActive ? "text-primary" : "text-text-muted"}`}>
              <span className="relative">
                <Icon size={20} />
                {badge === "unread" && unread > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-paper" />}
              </span>
              {short || label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
