import { useOutletContext } from 'react-router-dom';
import { useAdminData } from '../../hooks/useAdminData';
import { Badge, Card, Table } from '../../components/ui';

export default function Dashboard() {
  const { refreshPendingCount } = useOutletContext() || {};
  const { events, excuses, announcements, logs, notifications, loading, error } = useAdminData();

  if (loading) {
    return <p className="text-sm text-mut">Loading dashboard metrics...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red/30 bg-red/10 p-4 text-sm text-red">
        {error}
      </div>
    );
  }

  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => e.status === 'Upcoming');
  const ongoingEvents = events.filter((e) => e.status === 'Ongoing' || e.status === 'Active');

  const pendingExcuses = excuses.filter((e) => e.status === 'Pending');
  const approvedCount = excuses.filter((e) => e.status === 'Approved').length;
  const rejectedCount = excuses.filter((e) => e.status === 'Rejected').length;

  const recentAnnouncements = announcements.filter((a) => a.status === 'Published').slice(0, 5);
  const recentLogs = logs.slice(0, 5);
  const recentNotifications = notifications.filter((n) => !n.is_archived).slice(0, 5);

  if (refreshPendingCount) refreshPendingCount();

  const statCards = [
    { label: 'Total Events', value: totalEvents },
    { label: 'Upcoming / Ongoing', value: `${upcomingEvents.length} / ${ongoingEvents.length}` },
    { label: 'Pending Excuses', value: pendingExcuses.length },
    { label: 'Approved / Rejected', value: `${approvedCount} / ${rejectedCount}` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-line bg-soft/60 p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-medium text-mut dark:text-slate-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Upcoming Events">
          <Table
            keyField="id"
            emptyMessage="No upcoming events scheduled."
            rows={upcomingEvents.slice(0, 5)}
            columns={[
              { key: 'name', label: 'Event' },
              { key: 'event_date', label: 'Date' },
              { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ]}
          />
        </Card>

        <Card title="Pending Excuse Requests">
          <Table
            keyField="id"
            emptyMessage="No pending excuse requests."
            rows={pendingExcuses.slice(0, 5)}
            columns={[
              {
                key: 'student',
                label: 'Student',
                render: (r) => r.students?.full_name || r.student_id,
              },
              { key: 'reason', label: 'Reason' },
              { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ]}
          />
        </Card>

        <Card title="Recent Announcements">
          <Table
            keyField="id"
            emptyMessage="No published announcements yet."
            rows={recentAnnouncements}
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'ann_date', label: 'Date' },
              { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ]}
          />
        </Card>

        <Card title="Recent Activities & Notifications">
          {recentLogs.length === 0 && recentNotifications.length === 0 ? (
            <p className="text-sm text-mut">No recent activity or notifications.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((item) => (
                <div
                  key={`log-${item.id}`}
                  className="rounded-lg border border-line/70 bg-soft/40 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <span className="font-semibold text-ink dark:text-white">{item.action}</span>
                  <span className="text-mut"> &middot; {item.module}</span>
                  {item.description && (
                    <p className="mt-0.5 text-mut dark:text-slate-300">{item.description}</p>
                  )}
                </div>
              ))}
              {recentNotifications.slice(0, 2).map((notif) => (
                <div
                  key={`notif-${notif.id}`}
                  className="rounded-lg border border-admin-active/30 bg-admin-active/5 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-ink dark:text-white">{notif.title}</span>
                  {notif.message && <p className="mt-0.5 text-mut">{notif.message}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}