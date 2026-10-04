import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMarkAllRead, useMarkRead, useNotificationList, useUnreadCount } from "../../hooks/useNotifications";
import { homePathFor } from "../../lib/constants";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import LoadingState from "../ui/LoadingState";
import NotificationItem from "./NotificationItem";

/** Bell with unread badge and a dropdown of the latest notifications. */
export default function NotificationPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const base = homePathFor(user?.role);

  const { data: unread = 0 } = useUnreadCount();
  const list = useNotificationList({ pageSize: 8 });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleItem(item) {
    if (!item.is_read) markRead.mutate(item.id);
    setOpen(false);
    if (item.work_id) navigate(`${base}/works/${item.work_id}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-text-muted transition hover:bg-paper-off hover:text-text-dark"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-14 z-40 overflow-hidden rounded-2xl border border-border-muted bg-paper shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-border-muted px-4 py-3">
            <h2 className="text-sm font-semibold text-text-dark">Notifications</h2>
            <button
              onClick={() => markAll.mutate()}
              disabled={!unread || markAll.isPending}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary disabled:text-text-muted disabled:opacity-60"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          </div>
          <div className="max-h-[60vh] divide-y divide-border-muted overflow-y-auto">
            {list.isLoading ? (
              <LoadingState />
            ) : list.isError ? (
              <ErrorState error={list.error} onRetry={list.refetch} />
            ) : list.data.data.length === 0 ? (
              <EmptyState compact title="No notifications" description="You're all caught up." />
            ) : (
              list.data.data.map((n) => <NotificationItem key={n.id} item={n} onClick={handleItem} />)
            )}
          </div>
          <Link
            to={`${base}/notifications`}
            onClick={() => setOpen(false)}
            className="block border-t border-border-muted px-4 py-3 text-center text-xs font-medium text-primary hover:bg-paper-off"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
