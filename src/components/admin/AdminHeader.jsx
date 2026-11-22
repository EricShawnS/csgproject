import { Link } from 'react-router-dom';
import { Menu, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminHeader({ title = 'Dashboard', onOpenMenu }) {
  const { user, profile, role } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
  const roleLabel =
    role === 'admin' || profile?.role === 'admin' ? 'Administrator' : role || 'Admin';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="rounded-lg p-1.5 text-ink hover:bg-soft dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-ink dark:text-white">{title}</h1>
      </div>

      <Link
        to="/admin/settings"
        title="Go to Account Settings"
        className="inline-flex items-center gap-2.5 rounded-full border border-line bg-soft py-1 pl-1.5 pr-3 text-xs font-medium text-ink transition hover:border-indigo-400/60 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="h-6 w-6 rounded-full object-cover ring-1 ring-indigo-400/40"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
            <User className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="truncate">
          {displayName} · {roleLabel}
        </span>
      </Link>
    </header>
  );
}