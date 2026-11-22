import { useCallback, useEffect, useState } from 'react';
import { Outlet, useMatches } from 'react-router-dom';
import OfficerSidebar from '../components/officer/OfficerSidebar';
import OfficerHeader from '../components/officer/OfficerHeader';
import { fetchNotifications } from '../services/notificationsService';

export default function OfficerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [notifications, setNotifications] = useState([]);
  const matches = useMatches();
  const currentMatch = matches[matches.length - 1];
  const pageTitle = currentMatch?.handle?.title || 'Dashboard';

  const refreshNotifications = useCallback(async () => {
    try {
      const items = await fetchNotifications();
      setNotifications(items.filter((n) => !n.is_archived));
    } catch {
      // Non-blocking header notification fetch
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications, currentMatch?.pathname]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex min-h-screen bg-white text-ink dark:bg-slate-950 dark:text-slate-100">
      <OfficerSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfficerHeader
          title={pageTitle}
          searchQuery={headerSearch}
          onSearchChange={setHeaderSearch}
          unreadCount={unreadCount}
          notifications={notifications}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-5">
          <Outlet context={{ headerSearch, setHeaderSearch, refreshNotifications }} />
        </main>
      </div>
    </div>
  );
}