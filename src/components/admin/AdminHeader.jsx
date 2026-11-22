import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminHeader({ title, onOpenMenu }) {
  const { profile, role, user } = useAuth();

  const displayName = profile?.full_name || user?.email || 'Administrator';
  const roleLabel = role === 'instructor' ? 'Instructor' : 'Administrator';

  return (
    <header className="no-print flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
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

      <div className="flex items-center gap-2.5">
        <span className="rounded-full border border-line bg-soft px-3 py-1 text-xs font-medium text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {displayName} &middot; {roleLabel}
        </span>
      </div>
    </header>
  );
}