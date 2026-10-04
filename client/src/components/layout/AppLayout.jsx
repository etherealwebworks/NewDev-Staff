import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useSettings } from "../../hooks/useSettings";
import { ADMIN_NAV, STAFF_NAV } from "./navConfig";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/** One shell for both roles; the role only decides which nav items appear. */
export default function AppLayout({ role }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "1");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = role === "admin" ? ADMIN_NAV : STAFF_NAV;
  const { data: settings } = useSettings();
  const { applyDefaultTheme } = useTheme();

  // Company name in the tab title; company default theme until the person picks their own.
  useEffect(() => {
    if (settings?.company_name) document.title = `${settings.company_name} · Work Management`;
    if (settings?.default_theme) applyDefaultTheme(settings.default_theme);
  }, [settings, applyDefaultTheme]);

  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0"), [collapsed]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-paper-off">
      {/* Desktop sidebar */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 lg:block ${collapsed ? "w-[68px]" : "w-60"}`}>
        <Sidebar items={items} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/60 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] lg:hidden"
            >
              <Sidebar items={items} onNavigate={() => setDrawerOpen(false)} onClose={() => setDrawerOpen(false)} onLogout={handleLogout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawerOpen(true)} />
        <main className={`flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 ${role === "staff" ? "pb-24 lg:pb-8" : ""}`}>
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      {role === "staff" && <BottomNav items={items} />}
    </div>
  );
}
