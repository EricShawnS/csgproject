import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  Trophy,
  Music,
  GraduationCap,
  HeartHandshake,
  Gamepad2,
  Mic,
  PartyPopper,
  CalendarDays,
} from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import { Badge, Card, Table } from '../../components/ui';

const SUPABASE_URL = 'https://ocsnjcvvfqkgogtktmwr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc25qY3Z2ZnFrZ29ndGt0bXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMjc5MDksImV4cCI6MjExMDgwMzkwOX0.YNc51tFZFK2GvYNefZj5M2Nu56W7-55sTcakNzcBvuo';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ICON_PRESETS = [
  {
    key: 'trophy',
    label: 'Sports',
    Icon: Trophy,
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    key: 'gamepad',
    label: 'Esports',
    Icon: Gamepad2,
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  {
    key: 'music',
    label: 'Music / Band',
    Icon: Music,
    badgeClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  },
  {
    key: 'academic',
    label: 'Academic',
    Icon: GraduationCap,
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  {
    key: 'outreach',
    label: 'Outreach',
    Icon: HeartHandshake,
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    key: 'stage',
    label: 'Stage / Mic',
    Icon: Mic,
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  },
  {
    key: 'social',
    label: 'Social / Party',
    Icon: PartyPopper,
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  },
  {
    key: 'calendar',
    label: 'General',
    Icon: CalendarDays,
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  },
];

function detectIconKeyFromText(event) {
  const text = `${event?.name || ''} ${event?.description || ''}`.toLowerCase();

  if (
    /\b(sport|sports|intramural|intrams|tournament|basketball|volleyball|football|soccer|badminton|chess|athletic|run|marathon|liga|palaro)\b/.test(
      text
    )
  ) {
    return 'trophy';
  }

  if (
    /\b(esport|esports|gaming|game|mlbb|valorant|hackathon|coding|tech|lan|controller)\b/.test(
      text
    )
  ) {
    return 'gamepad';
  }

  if (
    /\b(band|bands|music|concert|jam|sing|song|acoustic|choir|battle of the bands|gig|festival|dj|dance)\b/.test(
      text
    )
  ) {
    return 'music';
  }

  if (
    /\b(seminar|workshop|orientation|assembly|symposium|lecture|quiz|academic|graduation|recognition)\b/.test(
      text
    )
  ) {
    return 'academic';
  }

  if (
    /\b(outreach|charity|donation|clean|volunteer|community|tree planting|blood)\b/.test(text)
  ) {
    return 'outreach';
  }

  if (/\b(pageant|talent|open mic|debate|speaking|host)\b/.test(text)) {
    return 'stage';
  }

  if (/\b(party|acquaintance|celebration|year-end|christmas|halloween|foundation)\b/.test(text)) {
    return 'social';
  }

  return 'calendar';
}

function getEventIconMeta(event) {
  const explicitKey =
    event?.icon_key && event.icon_key !== 'auto' ? event.icon_key : detectIconKeyFromText(event);
  return ICON_PRESETS.find((item) => item.key === explicitKey) || ICON_PRESETS[7];
}

const STATUS_META = [
  { key: 'Present', label: 'Present', color: '#10b981' },
  { key: 'Absent', label: 'Absent', color: '#ef4444' },
  { key: 'Late', label: 'Late', color: '#f59e0b' },
  { key: 'Excused', label: 'Excused', color: '#3b82f6' },
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildPieSlicePath(cx, cy, r, startAngle, endAngle) {
  if (endAngle - startAngle >= 359.99) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 0 ${cx} ${cy + r}`,
      `A ${r} ${r} 0 1 0 ${cx} ${cy - r}`,
      'Z',
    ].join(' ');
  }
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? '1' : '0';
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function AttendancePieChart({ counts }) {
  const total = STATUS_META.reduce((acc, item) => acc + (counts[item.key] || 0), 0);

  if (total === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-mut">
        No attendance records yet.
      </div>
    );
  }

  let currentAngle = 0;
  const slices = STATUS_META.map((item) => {
    const value = counts[item.key] || 0;
    const angle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    return { ...item, value, startAngle, endAngle };
  }).filter((s) => s.value > 0);

  return (
    <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
      <div className="relative flex h-48 w-48 shrink-0 items-center justify-center">
        <svg viewBox="0 0 160 160" className="h-full w-full">
          {slices.map((slice) => (
            <path
              key={slice.key}
              d={buildPieSlicePath(80, 80, 72, slice.startAngle, slice.endAngle)}
              fill={slice.color}
              stroke="#0f172a"
              strokeWidth="1.5"
            >
              <title>{`${slice.label}: ${slice.value} (${Math.round((slice.value / total) * 100)}%)`}</title>
            </path>
          ))}
        </svg>
      </div>

      <div className="w-full space-y-2.5">
        {STATUS_META.map((item) => {
          const val = counts[item.key] || 0;
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-lg border border-line/60 bg-soft/40 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-ink dark:text-slate-200">{item.label}</span>
              </div>
              <span className="font-semibold text-ink dark:text-white">
                {val} <span className="font-normal text-mut">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttendanceStatusBarChart({ counts }) {
  const total = STATUS_META.reduce((acc, item) => acc + (counts[item.key] || 0), 0);

  if (total === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-mut">
        No attendance records yet.
      </div>
    );
  }

  const maxCount = Math.max(1, ...STATUS_META.map((item) => counts[item.key] || 0));

  return (
    <div className="flex h-52 items-end justify-around gap-4 border-b border-line px-3 pt-6 dark:border-slate-700">
      {STATUS_META.map((item) => {
        const val = counts[item.key] || 0;
        const barHeightPct = val > 0 ? Math.max(8, Math.round((val / maxCount) * 100)) : 0;

        return (
          <div key={item.key} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1.5 text-xs font-semibold text-ink dark:text-slate-200">
              {val}
            </span>

            <div className="flex h-36 w-full max-w-[52px] items-end justify-center">
              <div
                style={{
                  height: `${barHeightPct}%`,
                  backgroundColor: item.color,
                }}
                className="w-full rounded-t-md transition-all duration-300"
                title={`${item.label}: ${val}`}
              />
            </div>

            <span className="mt-2 text-xs font-medium text-mut dark:text-slate-300">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { refreshPendingCount } = useOutletContext() || {};
  const adminData = useAdminData();
  const { events, excuses, announcements, logs, notifications, loading, error } = adminData;

  const [attendanceRows, setAttendanceRows] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('all');

  useEffect(() => {
    if (refreshPendingCount) refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      const hookAttendance =
        adminData.attendance || adminData.attendanceRecords || adminData.attendances;

      if (Array.isArray(hookAttendance) && hookAttendance.length > 0) {
        if (active) setAttendanceRows(hookAttendance);
        return;
      }

      const { data, error: attError } = await supabaseClient
        .from('attendance')
        .select('*')
        .limit(1000);

      if (active && !attError && Array.isArray(data)) {
        setAttendanceRows(data);
      }
    }

    loadAttendance();
    return () => {
      active = false;
    };
  }, [adminData.attendance, adminData.attendanceRecords, adminData.attendances]);

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

  const filteredAttendance =
    selectedEventId === 'all'
      ? attendanceRows
      : attendanceRows.filter((row) => String(row.event_id) === String(selectedEventId));

  const statusCounts = { Present: 0, Absent: 0, Late: 0, Excused: 0 };

  for (const row of filteredAttendance) {
    const rawStatus = String(row.status || '').trim().toLowerCase();
    if (rawStatus === 'present') statusCounts.Present += 1;
    else if (rawStatus === 'absent') statusCounts.Absent += 1;
    else if (rawStatus === 'late') statusCounts.Late += 1;
    else if (rawStatus === 'excused') statusCounts.Excused += 1;
  }

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
        <Card
          title="Event Attendance Overview"
          action={
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="rounded-lg border border-line bg-soft/70 px-2.5 py-1 text-xs text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          }
        >
          <AttendancePieChart counts={statusCounts} />
        </Card>

        <Card title="Attendance Status Breakdown">
          <AttendanceStatusBarChart counts={statusCounts} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="All Events Preview"
          action={
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="rounded-lg border border-line bg-soft/60 px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-soft dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              View All
            </button>
          }
        >
          <Table
            keyField="id"
            emptyMessage="No events found."
            rows={events.slice(0, 5)}
            columns={[
              {
                key: 'name',
                label: 'Event',
                render: (ev) => {
                  const { Icon, badgeClass, label } = getEventIconMeta(ev);
                  return (
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${badgeClass}`}
                        title={label}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium text-ink dark:text-white">{ev.name}</span>
                    </div>
                  );
                },
              },
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