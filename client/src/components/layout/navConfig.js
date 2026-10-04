import { Bell, Building2, CalendarDays, ClipboardList, History, LayoutDashboard, Settings, UserCircle, UserCog } from "lucide-react";

// Navigation per spec (section 24).
export const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/staff", label: "Staff", icon: UserCog },
  { to: "/admin/clients", label: "Clients", icon: Building2 },
  { to: "/admin/works", label: "Works", icon: ClipboardList },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/activity", label: "Activity", icon: History },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, badge: "unread" },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export const STAFF_NAV = [
  { to: "/staff", label: "Dashboard", short: "Home", icon: LayoutDashboard, end: true },
  { to: "/staff/works", label: "My Works", short: "Works", icon: ClipboardList },
  { to: "/staff/calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { to: "/staff/notifications", label: "Notifications", short: "Alerts", icon: Bell, badge: "unread" },
  { to: "/staff/profile", label: "Profile", short: "Profile", icon: UserCircle },
];
