import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, CheckCheck, ExternalLink } from 'lucide-react';
import {
  fetchNotifications,
  markNotificationRead,
  archiveNotification,
} from '../../services/notificationsService';
import { Badge, Button, Card, Input, Select, Toast } from '../../components/ui';

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchNotifications();
      setItems(data);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (n) => {
    try {
      await markNotificationRead(n.id, true);
      showToast('Marked as read.');
      await load();
    } catch (err) {
      showToast(err.message || 'Unable to update notification.');
    }
  };

  const handleArchive = async (n) => {
    try {
      await archiveNotification(n.id);
      showToast('Notification archived.');
      await load();
    } catch (err) {
      showToast(err.message || 'Unable to archive notification.');
    }
  };

  const filtered = items.filter((n) => {
    if (statusFilter === 'Active' && n.is_archived) return false;
    if (statusFilter === 'Unread' && (n.is_archived || n.is_read)) return false;
    if (statusFilter === 'Read' && (n.is_archived || !n.is_read)) return false;
    if (statusFilter === 'Archived' && !n.is_archived) return false;
    if (typeFilter !== 'All' && n.type !== typeFilter) return false;
    if (dateFilter && n.created_at?.slice(0, 10) !== dateFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Type"
            id="notif-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="event">Events</option>
            <option value="excuse">Excuse Requests</option>
            <option value="announcement">Announcements</option>
            <option value="system">System</option>
          </Select>

          <Select
            label="Status"
            id="notif-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Active">Active (Non-Archived)</option>
            <option value="Unread">Unread</option>
            <option value="Read">Read</option>
            <option value="Archived">Archived</option>
          </Select>

          <Input
            label="Date"
            id="notif-date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading notifications...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-mut">No notifications match your filters.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((n) => (
            <Card key={n.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink dark:text-white">{n.title}</span>
                    <Badge tone={n.is_read ? 'Archived' : 'Pending'}>
                      {n.is_read ? 'Read' : 'Unread'}
                    </Badge>
                    <span className="text-xs text-mut">
                      {n.type} &middot; {n.created_at?.slice(0, 10) || ''}
                    </span>
                  </div>
                  {n.message && (
                    <p className="mt-1 text-xs text-mut dark:text-slate-300">{n.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {n.target_path && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(n.target_path)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  )}
                  {!n.is_read && (
                    <Button variant="secondary" size="sm" onClick={() => handleMarkRead(n)}>
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark Read
                    </Button>
                  )}
                  {!n.is_archived && (
                    <Button variant="ghost" size="sm" onClick={() => handleArchive(n)}>
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}