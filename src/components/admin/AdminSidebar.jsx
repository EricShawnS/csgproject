import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Calendar,
  FileText,
  Megaphone,
  Users,
  UserCog,
  BarChart3,
  Bell,
  ScrollText,
  HelpCircle,
  Settings,
  LogOut,
  Star,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/admin/events', label: 'Event Management', icon: Calendar },
  { to: '/admin/excuse-requests', label: 'Excuse Requests', icon: FileText, showPendingBadge: true },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/students', label: 'Student Records', icon: Users },
  { to: '/admin/officers', label: 'Manage Officers', icon: UserCog },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/activity-log', label: 'Activity Log', icon: ScrollText },
  { to: '/admin/help', label: 'Help Center', icon: HelpCircle },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar({ pendingExcusesCount = 0, mobileOpen = false, onClose }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navContent = (
    <aside className="flex h-full w-[230px] shrink-0 flex-col bg-admin-aside px-2.5 py-3.5 text-white">
      <div className="flex shrink-0 items-center justify-between px-1.5 pb-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-white text-sm">
            <Star className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <span className="text-[22px] font-bold">CSG</span>
            <small className="block text-[10px] font-normal text-admin-nav">
              Admin / Instructor System
            </small>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1 text-admin-nav hover:bg-admin-hover hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <h4 className="mx-1.5 mb-2 shrink-0 text-xs font-semibold uppercase tracking-wider text-admin-heading">
        Main Menu
      </h4>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon, end, showPendingBadge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-[9px] text-[15px] transition-colors ${
                isActive
                  ? 'bg-admin-active font-medium text-white'
                  : 'text-admin-nav hover:bg-admin-hover hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
            {showPendingBadge && pendingExcusesCount > 0 && (
              <span className="ml-auto rounded-[10px] bg-red px-[7px] text-[11px] font-semibold text-white">
                {pendingExcusesCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-2 shrink-0 border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-[9px] text-left text-[15px] text-admin-nav transition-colors hover:bg-admin-hover hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:flex md:h-full">{navContent}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <div className="relative z-50 flex h-full">{navContent}</div>
        </div>
      )}
    </>
  );
}