import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Pin,
  CalendarDays,
  Megaphone,
  Tag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchAnnouncements } from '../../services/announcementsService';
import { Badge, Button, Card, Toast } from '../../components/ui';

const TABS = ['All', 'Unread', 'Read', 'Archived'];

function getAnnouncementImage(item) {
  return item?.image_url || item?.banner_url || '';
}

function getCategoryMeta(category) {
  const cat = String(category || 'General').toLowerCase();
  if (cat.includes('event')) {
    return {
      Icon: CalendarDays,
      badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      label: 'Event',
    };
  }
  if (cat.includes('finance') || cat.includes('pay') || cat.includes('fee')) {
    return {
      Icon: Tag,
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      label: 'Finance',
    };
  }
  return {
    Icon: Megaphone,
    badgeClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    label: category || 'General',
  };
}

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState([]);
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

  const markRead = async (item, silent = false) => {
    if (item.is_read) return;
    const { error: err } = await supabase
      .from('announcements')
      .update({ is_read: true })
      .eq('id', item.id);
    if (err) {
      showToast(err.message);
      return;
    }
    setItems((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, is_read: true } : a))
    );
    if (!silent) showToast('Marked as read.');
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

  const toggleExpand = async (item) => {
    const willExpand = !expandedIds.includes(item.id);
    setExpandedIds((prev) =>
      willExpand ? [...prev, item.id] : prev.filter((id) => id !== item.id)
    );
    if (willExpand && !item.is_read && !item.is_archived) {
      await markRead(item, true);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (tab === 'Unread' && (a.is_archived || a.is_read)) return false;
      if (tab === 'Read' && (a.is_archived || !a.is_read)) return false;
      if (tab === 'Archived' && !a.is_archived) return false;
      if (!q) return true;
      const bodyText = a.body || a.content || '';
      return (
        String(a.title || '').toLowerCase().includes(q) ||
        String(bodyText).toLowerCase().includes(q) ||
        String(a.category || '').toLowerCase().includes(q)
      );
    });
  }, [items, tab, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
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
        Announcements are published by the Admin/Instructor system and received here. Click a post to expand full details.
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
          {filtered.map((a) => {
            const isExpanded = expandedIds.includes(a.id);
            const bodyText = a.body || a.content || '';
            const imgSrc = getAnnouncementImage(a);
            const { Icon, badgeClass, label } = getCategoryMeta(a.category);

            return (
              <Card key={a.id}>
                <div
                  onClick={() => toggleExpand(a)}
                  className="flex cursor-pointer flex-wrap items-start justify-between gap-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={a.title}
                        className="aspect-[4/3] h-11 w-14 shrink-0 rounded-lg border border-line object-cover dark:border-slate-700"
                      />
                    ) : (
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${badgeClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-ink dark:text-white">{a.title}</h3>
                        {a.is_pinned && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                            <Pin className="h-2.5 w-2.5" />
                            Pinned
                          </span>
                        )}
                        <span
                          className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}
                        >
                          {label}
                        </span>
                        <Badge
                          tone={a.is_archived ? 'Archived' : a.is_read ? 'Published' : 'Pending'}
                        >
                          {a.is_archived ? 'Archived' : a.is_read ? 'Read' : 'Unread'}
                        </Badge>
                      </div>

                      <p className="mt-0.5 text-xs text-mut">
                        From {a.sender || 'Admin'} &middot; {a.ann_date || '—'}
                        {a.target_audience ? ` · ${a.target_audience}` : ''}
                        {imgSrc ? ' · Photo attached' : ''}
                      </p>

                      {!isExpanded && bodyText && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-ink/85 dark:text-slate-300">
                          {bodyText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!a.is_read && !a.is_archived && (
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
                    <button
                      type="button"
                      onClick={() => toggleExpand(a)}
                      className="rounded-lg p-1.5 text-mut hover:bg-soft hover:text-ink dark:hover:bg-slate-800 dark:hover:text-white"
                      title={isExpanded ? 'Collapse post' : 'Expand full post'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-line/70 pt-3 dark:border-slate-800">
                    {bodyText && (
                      <p className="whitespace-pre-line text-xs leading-relaxed text-ink dark:text-slate-200">
                        {bodyText}
                      </p>
                    )}

                    {imgSrc && (
                      <div className="mx-auto max-w-lg overflow-hidden rounded-xl border border-line bg-slate-950 dark:border-slate-800">
                        <img
                          src={imgSrc}
                          alt={a.title}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}