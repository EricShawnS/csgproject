import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Printer, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchEvents } from '../../services/eventsService';
import { fetchStudents } from '../../services/studentsService';
import { fetchAttendanceByEvent, upsertAttendanceStatus } from '../../services/attendanceService';
import { fetchExcuseRequests } from '../../services/excuseRequestsService';
import { Badge, Button, Card, Select, Table, Toast } from '../../components/ui';

const STATUS_OPTIONS = ['Present', 'Late', 'Absent', 'Excused'];

export default function Attendance() {
  const { headerSearch = '' } = useOutletContext() || {};
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [excuses, setExcuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEvents(), fetchStudents(), fetchExcuseRequests()])
      .then(([ev, st, ex]) => {
        setEvents(ev);
        setStudents(st);
        setExcuses(ex);
        if (ev.length > 0) setSelectedEventId(String(ev[0].id));
        setError('');
      })
      .catch((err) => setError(err.message || 'Failed to load attendance data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setRecords([]);
      return;
    }
    fetchAttendanceByEvent(selectedEventId)
      .then(setRecords)
      .catch((err) => setError(err.message || 'Failed to load event attendance.'));
  }, [selectedEventId]);

  const activeEvent = events.find((e) => String(e.id) === String(selectedEventId));
  const recordByStudent = Object.fromEntries(records.map((r) => [r.student_id, r]));

  const q = headerSearch.trim().toLowerCase();
  const visibleStudents = q
    ? students.filter(
        (s) =>
          String(s.id || '').toLowerCase().includes(q) ||
          String(s.full_name || '').toLowerCase().includes(q)
      )
    : students;

  const handleStatusChange = async (studentId, nextStatus) => {
    if (!selectedEventId) return;
    try {
      const saved = await upsertAttendanceStatus(
        { eventId: Number(selectedEventId), studentId, status: nextStatus },
        actor
      );
      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.student_id === studentId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });
      showToast(`Marked ${studentId} as ${nextStatus}.`);
    } catch (err) {
      showToast(err.message || 'Could not update attendance.');
    }
  };

  const eventExcuses = excuses.filter(
    (ex) => !selectedEventId || String(ex.event_id) === String(selectedEventId)
  );

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-3">
        <div className="w-60">
          <Select
            label="Event"
            id="att-event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.length === 0 && <option value="">No events available</option>}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.event_date || 'TBD'})
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            Print Proof
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => showToast('Attendance proof summary prepared for email dispatch.')}
          >
            <Mail className="h-3.5 w-3.5" />
            Email Proof
          </Button>
        </div>
      </div>

      {activeEvent && (
        <p className="text-xs text-mut">
          Venue: <strong className="text-ink dark:text-slate-200">{activeEvent.venue || '—'}</strong> &middot;{' '}
          Penalty Tracking:{' '}
          <strong className="text-ink dark:text-slate-200">
            {activeEvent.penalty_tracking
              ? `Late ₱${activeEvent.late_fee || 0}, Absent ₱${activeEvent.absent_fee || 0}`
              : 'Disabled'}
          </strong>
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading attendance roster...</p>
      ) : (
        <Table
          keyField="id"
          rows={visibleStudents}
          emptyMessage="No students available for attendance."
          columns={[
            { key: 'id', label: 'Student ID' },
            {
              key: 'full_name',
              label: 'Student Name',
              render: (s) => <span className="font-semibold">{s.full_name}</span>,
            },
            {
              key: 'course_sec',
              label: 'Course / Section',
              render: (s) => `${s.course || '—'} · ${s.year_level || ''} ${s.section || ''}`.trim(),
            },
            {
              key: 'status',
              label: 'Attendance Status',
              render: (s) => {
                const currentStatus = recordByStudent[s.id]?.status || 'Absent';
                return (
                  <select
                    aria-label={`Status for ${s.full_name}`}
                    value={currentStatus}
                    disabled={!selectedEventId}
                    onChange={(e) => handleStatusChange(s.id, e.target.value)}
                    className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                );
              },
            },
            {
              key: 'recorded_time',
              label: 'Recorded Time',
              render: (s) => recordByStudent[s.id]?.recorded_time || '—',
            },
          ]}
        />
      )}

      <Card
        title="Excuse Decisions from Admin"
        subtitle="Approved excuses mark attendance Excused with no penalty; Rejected stays Absent with penalty per event policy."
      >
        <Table
          keyField="id"
          rows={eventExcuses}
          emptyMessage="No excuse requests for this selection."
          columns={[
            {
              key: 'student',
              label: 'Student',
              render: (ex) => ex.students?.full_name || ex.student_id,
            },
            { key: 'reason', label: 'Reason' },
            {
              key: 'status',
              label: 'Decision',
              render: (ex) => <Badge>{ex.status || 'Pending'}</Badge>,
            },
            { key: 'remarks', label: 'Remarks', render: (ex) => ex.remarks || '—' },
          ]}
        />
      </Card>

      <Toast message={toast} />
    </div>
  );
}