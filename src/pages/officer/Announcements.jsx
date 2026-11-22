import { useEffect, useState } from 'react';
import { Search, Archive, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchAnnouncements } from '../../services/announcementsService';
import { Badge, Button, Card, Toast } from '../../components/ui';

const TABS = ['All', 'Unread', 'Read', 'Archived'];

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
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
      const data = await fetchAnnouncements();
      // Only show published or archived announcements received from Admin
      setItems(data.filter((a) => (a.status || 'Published') !== 'Draft'));
    } catch (err) {
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (item) => {
    const { error: err } = await supabase
      .from('announcements')
      .update({ is_read: true })
      .eq('id', item.id);
    if (err) {
      showToast(err.message);
      return;
    }
    showToast('Marked as read.');
    await load();
  };

  const archiveItem = async (item) => {
    const { error: err } = await supabase
      .from('announcements')
      .update({ is_archived: true })
      .eq('id', item.id);
    if (err) {
      showToast(err.message);
      return;
    }
    showToast('Announcement archived.');
    await load();
  };

  const q = search.trim().toLowerCase();
  const filtered = items.filter((a) => {
    if (tab === 'Unread' && (a.is_archived || a.is_read)) return false;
    if (tab === 'Read' && (a.is_archived || !a.is_read)) return false;
    if (tab === 'Archived' && !a.is_archived) return false;
    if (!q) return true;
    return (
      String(a.title || '').toLowerCase().includes(q) ||
      String(a.body || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mut" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcement"
            aria-label="Search announcement"
            className="w-full rounded-full border border-line bg-white py-1.5 pl-8 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <div className="inline-flex rounded-xl border border-line bg-soft/60 p-1 dark:border-slate-800 dark:bg-slate-900">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                tab === t
                  ? 'bg-ink text-white dark:bg-slate-700'
                  : 'text-mut hover:text-ink dark:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-mut">
        Announcements are published by the Admin/Instructor system and received here.
      </p>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading announcements...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-mut">No announcements match this filter.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-ink dark:text-white">{a.title}</h3>
                    <Badge tone={a.is_archived ? 'Archived' : a.is_read ? 'Published' : 'Pending'}>
                      {a.is_archived ? 'Archived' : a.is_read ? 'Read' : 'Unread'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-mut">
                    From {a.sender || 'Admin'} &middot; {a.ann_date || '—'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {!a.is_read && (
                    <Button variant="secondary" size="sm" onClick={() => markRead(a)}>
                      <Check className="h-3.5 w-3.5" />
                      Mark Read
                    </Button>
                  )}
                  {!a.is_archived && (
                    <Button variant="ghost" size="sm" onClick={() => archiveItem(a)}>
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>
              {a.body && (
                <p className="mt-2.5 text-xs leading-relaxed text-ink dark:text-slate-200">
                  {a.body}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}