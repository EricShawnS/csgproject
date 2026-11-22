import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  CheckSquare,
  PhilippinePeso,
  FileBarChart2,
  Calendar,
  Mail,
  HelpCircle,
  Settings,
  LogOut,
  Smile,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const OFFICER_MAIN_NAV = [
  { to: '/officer', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/officer/students', label: 'Students', icon: Users },
  { to: '/officer/attendance', label: 'Attendance', icon: CheckSquare },
  { to: '/officer/penalties-payments', label: 'Penalties & Payments', icon: PhilippinePeso },
  { to: '/officer/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/officer/events', label: 'Events', icon: Calendar },
  { to: '/officer/announcements', label: 'Announcements', icon: Mail },
];

const OFFICER_FOOTER_NAV = [
  { to: '/officer/help', label: 'Help Center', icon: HelpCircle },
  { to: '/officer/settings', label: 'Settings', icon: Settings },
];

export default function OfficerSidebar({ mobileOpen = false, onClose }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-[9px] text-[15px] transition-colors ${
      isActive
        ? 'bg-soft font-semibold text-ink dark:bg-slate-800 dark:text-white'
        : 'text-neutral-700 hover:bg-soft/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
    }`;

  const navContent = (
    <aside className="flex h-full w-[230px] shrink-0 flex-col border-r-[3px] border-line bg-white px-2.5 py-3.5 text-ink dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between px-1.5 pb-7">
        <div className="flex items-center gap-2.5 text-[22px] font-bold">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-black dark:border-slate-200">
            <Smile className="h-4 w-4" />
          </span>
          <span>CSG</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1 text-neutral-600 hover:bg-soft dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <h4 className="mx-1.5 mb-2 text-base font-semibold text-ink dark:text-slate-200">
        Main Menu
      </h4>

      <nav className="flex flex-1 flex-col gap-0.5">
        {OFFICER_MAIN_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onClose} className={navLinkClass}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}

        <div className="flex-1" />

        {OFFICER_FOOTER_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose} className={navLinkClass}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-[9px] text-left text-[15px] text-neutral-700 transition-colors hover:bg-soft/70 dark:text-slate-300 dark:hover:bg-slate-800/70"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </nav>
    </aside>
  );

  return (
    <>
      <div className="hidden md:block">{navContent}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <div className="relative z-50 flex h-full">{navContent}</div>
        </div>
      )}
    </>
  );
}