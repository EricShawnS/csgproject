import { useEffect, useState } from 'react';
import { Outlet, useMatches } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import { fetchExcuseRequests } from '../services/excuseRequestsService';

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const matches = useMatches();
  const currentMatch = matches[matches.length - 1];
  const pageTitle = currentMatch?.handle?.title || 'Dashboard';

  const refreshPendingCount = async () => {
    try {
      const list = await fetchExcuseRequests();
      setPendingCount(list.filter((r) => r.status === 'Pending').length);
    } catch {
      // Badge count is non-blocking
    }
  };

  useEffect(() => {
    refreshPendingCount();
  }, [currentMatch?.pathname]);

  return (
    <div className="flex min-h-screen bg-white text-ink dark:bg-slate-950 dark:text-slate-100">
      <AdminSidebar
        pendingExcusesCount={pendingCount}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader title={pageTitle} onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-5">
          <Outlet context={{ refreshPendingCount }} />
        </main>
      </div>
    </div>
  );
}