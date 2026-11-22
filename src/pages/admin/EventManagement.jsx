import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchEvents, createEvent, updateEvent } from '../../services/eventsService';
import { Badge, Button, Input, Modal, Select, Table, Textarea, Toast } from '../../components/ui';

const EMPTY_FORM = {
  id: null,
  name: '',
  description: '',
  instructions: '',
  event_date: '',
  event_time: '',
  venue: '',
  status: 'Upcoming',
  attendance_required: true,
  late_tracking: true,
  penalty_tracking: true,
  accept_excuse: true,
  show_on_calendar: true,
  late_fee: 0,
  absent_fee: 0,
};

export default function EventManagement() {
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setForm({
      id: ev.id,
      name: ev.name || '',
      description: ev.description || '',
      instructions: ev.instructions || '',
      event_date: ev.event_date || '',
      event_time: ev.event_time || '',
      venue: ev.venue || '',
      status: ev.status || 'Upcoming',
      attendance_required: Boolean(ev.attendance_required),
      late_tracking: Boolean(ev.late_tracking),
      penalty_tracking: Boolean(ev.penalty_tracking),
      accept_excuse: Boolean(ev.accept_excuse),
      show_on_calendar: Boolean(ev.show_on_calendar),
      late_fee: ev.late_fee ?? 0,
      absent_fee: ev.absent_fee ?? 0,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (form.id) {
        await updateEvent(form.id, form, actor);
        showToast('Event updated and synced.');
      } else {
        await createEvent({ ...form, source: 'admin' }, actor);
        showToast('Event created and published to CSG Tracker.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not save event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
        <span className="text-xs text-mut dark:text-slate-400">
          Saved events flow automatically to the CSG Student Tracker.
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading events...</p>
      ) : (
        <Table
          keyField="id"
          rows={events}
          emptyMessage="No events created yet. Click Create Event to schedule one."
          columns={[
            {
              key: 'name',
              label: 'Event',
              render: (ev) => (
                <div>
                  <p className="font-semibold text-ink dark:text-white">{ev.name}</p>
                  {ev.venue && <p className="text-xs text-mut">{ev.venue}</p>}
                </div>
              ),
            },
            {
              key: 'schedule',
              label: 'Date & Time',
              render: (ev) => `${ev.event_date || '—'} ${ev.event_time ? `· ${ev.event_time}` : ''}`,
            },
            {
              key: 'status',
              label: 'Status',
              render: (ev) => <Badge>{ev.status}</Badge>,
            },
            {
              key: 'requirements',
              label: 'Attendance Rules',
              render: (ev) => (
                <span className="text-xs text-mut dark:text-slate-300">
                  {ev.attendance_required ? 'Required' : 'Optional'} &middot;{' '}
                  {ev.penalty_tracking ? `Late ₱${ev.late_fee || 0} / Absent ₱${ev.absent_fee || 0}` : 'No penalty'}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (ev) => (
                <Button variant="secondary" size="sm" onClick={() => openEdit(ev)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        title={form.id ? 'Edit Event' : 'Create Event'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="event-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save Event'}
            </Button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleSave} className="space-y-3">
          <Input
            label="Event Name"
            id="ev-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="General Assembly / Orientation"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              id="ev-date"
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
            <Input
              label="Time"
              id="ev-time"
              type="time"
              value={form.event_time}
              onChange={(e) => setForm({ ...form, event_time: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Venue"
              id="ev-venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="University Gymnasium"
            />
            <Select
              label="Status / Schedule State"
              id="ev-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Published">Published</option>
              <option value="Past">Past</option>
            </Select>
          </div>
          <Textarea
            label="Description"
            id="ev-desc"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Textarea
            label="Attendance Requirements & Instructions"
            id="ev-inst"
            rows={2}
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="Dress code, call time, QR/sheet check-in rules..."
          />
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.attendance_required}
                onChange={(e) => setForm({ ...form, attendance_required: e.target.checked })}
              />
              Attendance required
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.late_tracking}
                onChange={(e) => setForm({ ...form, late_tracking: e.target.checked })}
              />
              Late tracking
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.penalty_tracking}
                onChange={(e) => setForm({ ...form, penalty_tracking: e.target.checked })}
              />
              Penalty tracking
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.accept_excuse}
                onChange={(e) => setForm({ ...form, accept_excuse: e.target.checked })}
              />
              Accept excuse requests
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Late Fee (₱)"
              id="ev-late-fee"
              type="number"
              min="0"
              value={form.late_fee}
              onChange={(e) => setForm({ ...form, late_fee: e.target.value })}
            />
            <Input
              label="Absent Fee (₱)"
              id="ev-absent-fee"
              type="number"
              min="0"
              value={form.absent_fee}
              onChange={(e) => setForm({ ...form, absent_fee: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}