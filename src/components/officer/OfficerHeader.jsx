import { useState } from 'react';
import { Bell, Menu, Search, Smile } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function OfficerHeader({
  title,
  searchQuery = '',
  onSearchChange,
  unreadCount = 0,
  notifications = [],
  onOpenMenu,
}) {
  const { profile, user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  const displayName = profile?.full_name || user?.email || 'CSG Officer';

  return (
    <header className="no-print relative flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="rounded-lg border border-line p-2 text-ink hover:bg-soft dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-ink dark:text-white">{title}</h1>
      </div>

      {onSearchChange && (
        <div className="relative min-w-[180px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mut" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search students"
            aria-label="Search students"
            className="w-full rounded-full border border-line bg-soft/60 py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-mut dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setNotifOpen((prev) => !prev)}
          aria-label="Notifications"
          className="relative rounded-full border border-line bg-soft/70 p-2 text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-red px-1.5 text-[10px] font-bold leading-4 text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <span className="flex items-center gap-1.5 rounded-full border border-line bg-soft px-3 py-1 text-xs font-medium text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Smile className="h-3.5 w-3.5" />
          {displayName}
        </span>
      </div>

      {notifOpen && (
        <div className="absolute right-5 top-14 z-30 w-80 rounded-xl border border-line bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between border-b border-line pb-1.5 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-mut">
              Recent Notifications
            </span>
            <button
              type="button"
              onClick={() => setNotifOpen(false)}
              className="text-xs text-mut hover:text-ink dark:hover:text-white"
            >
              Close
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-xs text-mut">No notifications yet.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {notifications.slice(0, 6).map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-line/70 bg-soft/40 p-2 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <p className="font-semibold text-ink dark:text-white">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-mut dark:text-slate-300">{n.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </header>
  );
}