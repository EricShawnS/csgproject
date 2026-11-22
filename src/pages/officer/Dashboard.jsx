import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchStudents } from '../../services/studentsService';
import { fetchEvents } from '../../services/eventsService';
import { fetchAllAttendance } from '../../services/attendanceService';
import { fetchPayments } from '../../services/paymentsService';
import { fetchAnnouncements } from '../../services/announcementsService';
import { fetchActivityLogs } from '../../services/ActivityLogService';
import { Badge, Card, Table } from '../../components/ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchStudents(),
      fetchEvents(),
      fetchAllAttendance(),
      fetchPayments(),
      fetchAnnouncements(),
      fetchActivityLogs(),
    ])
      .then(([st, ev, att, pay, ann, lg]) => {
        setStudents(st);
        setEvents(ev);
        setAttendance(att);
        setPayments(pay);
        setAnnouncements(ann.filter((a) => (a.status || 'Published') === 'Published'));
        setLogs(lg);
        setError('');
      })
      .catch((err) => setError(err.message || 'Failed to load officer dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-mut">Loading CSG dashboard...</p>;
  if (error) {
    return <div className="rounded-xl border border-red/30 bg-red/10 p-4 text-sm text-red">{error}</div>;
  }

  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const lateCount = attendance.filter((a) => a.status === 'Late').length;
  const absentCount = attendance.filter((a) => a.status === 'Absent').length;
  const excusedCount = attendance.filter((a) => a.status === 'Excused').length;
  const totalTracked = Math.max(attendance.length, 1);

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = calMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const eventDatesSet = new Set(
    events.filter((e) => e.show_on_calendar !== false && e.event_date).map((e) => e.event_date)
  );

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, iso, hasEvent: eventDatesSet.has(iso) });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-soft/60 p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-mut">Students</p>
            <p className="mt-1 text-xl font-bold">{students.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-soft/60 p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-mut">Events</p>
            <p className="mt-1 text-xl font-bold">{events.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-soft/60 p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-mut">Attendance Logs</p>
            <p className="mt-1 text-xl font-bold">{attendance.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-soft/60 p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-mut">Payments Collected</p>
            <p className="mt-1 text-xl font-bold">₱{totalCollected.toLocaleString()}</p>
          </div>
        </div>

        <Card title="Attendance Overview">
          <div className="space-y-2.5 text-xs">
            {[
              { label: 'Present', count: presentCount, barClass: 'bg-ok' },
              { label: 'Late', count: lateCount, barClass: 'bg-late' },
              { label: 'Absent', count: absentCount, barClass: 'bg-abs' },
              { label: 'Excused', count: excusedCount, barClass: 'bg-exc' },
            ].map((row) => {
              const pct = Math.round((row.count / totalTracked) * 100);
              return (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between">
                    <span className="font-semibold">{row.label}</span>
                    <span className="text-mut">{row.count} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-soft dark:bg-slate-800">
                    <div className={`h-full ${row.barClass}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Upcoming Events">
          <Table
            keyField="id"
            rows={events.slice(0, 5)}
            emptyMessage="No events available."
            columns={[
              { key: 'name', label: 'Event' },
              { key: 'event_date', label: 'Date' },
              { key: 'venue', label: 'Venue' },
              { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ]}
          />
        </Card>

        <Card title="Recent Announcements">
          {announcements.length === 0 ? (
            <p className="text-xs text-mut">No published announcements.</p>
          ) : (
            <div className="space-y-2">
              {announcements.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-line/80 bg-soft/40 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <p className="font-bold text-ink dark:text-white">{a.title}</p>
                  {a.body && <p className="mt-0.5 text-mut dark:text-slate-300">{a.body}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Activities">
          {logs.length === 0 ? (
            <p className="text-xs text-mut">No recent activity.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {logs.slice(0, 5).map((l) => (
                <li key={l.id} className="flex justify-between gap-2 border-b border-line/50 pb-1.5 dark:border-slate-800">
                  <span>
                    <strong>{l.action}</strong> — {l.description || l.module}
                  </span>
                  <span className="shrink-0 text-mut">{l.created_at?.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Event Calendar">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCalMonth(new Date(year, month - 1, 1))}
              className="rounded-lg border border-line p-1 hover:bg-soft dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold">{monthLabel}</span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCalMonth(new Date(year, month + 1, 1))}
              className="rounded-lg border border-line p-1 hover:bg-soft dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 font-semibold text-mut">
                {w}
              </div>
            ))}
            {cells.map((c, idx) =>
              c ? (
                <div
                  key={c.iso}
                  className={`rounded-lg py-1.5 font-medium ${
                    c.hasEvent
                      ? 'bg-admin-active font-bold text-white'
                      : 'bg-soft/50 dark:bg-slate-800/50'
                  }`}
                >
                  {c.day}
                </div>
              ) : (
                <div key={`empty-${idx}`} />
              )
            )}
          </div>
          <p className="mt-2.5 text-[11px] text-mut">
            Highlighted dates indicate scheduled CSG/Admin events.
          </p>
        </Card>
      </div>
    </div>
  );
}