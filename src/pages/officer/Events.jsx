import { useEffect, useState } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchEvents, createEvent, updateEvent } from '../../services/eventsService';
import { Badge, Button, Input, Modal, Select, Table, Textarea, Toast } from '../../components/ui';

const EMPTY_CSG_EVENT = {
  id: null,
  name: '',
  event_date: '',
  event_time: '',
  venue: '',
  description: '',
  status: 'Upcoming',
  source: 'officer',
  attendance_required: true,
  late_tracking: true,
  penalty_tracking: true,
  accept_excuse: true,
  show_on_calendar: true,
  late_fee: 0,
  absent_fee: 0,
};

export default function Events() {
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_CSG_EVENT);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
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

  const openAdd = () => {
    setForm(EMPTY_CSG_EVENT);
    setModalOpen(true);
  };

  const openConfigure = (ev) => {
    setForm({
      id: ev.id,
      name: ev.name || '',
      event_date: ev.event_date || '',
      event_time: ev.event_time || '',
      venue: ev.venue || '',
      description: ev.description || '',
      status: ev.status || 'Upcoming',
      source: ev.source || 'admin',
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
        showToast('Event attendance tracking updated.');
      } else {
        await createEvent({ ...form, source: 'officer' }, actor);
        showToast('CSG event created.');
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
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add CSG Event
        </Button>
        <span className="text-xs text-mut">
          Official events flow from Admin; configure attendance/penalty rules here or add CSG-only events.
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
          emptyMessage="No events found."
          columns={[
            {
              key: 'name',
              label: 'Event',
              render: (ev) => (
                <div>
                  <p className="font-semibold text-ink dark:text-white">{ev.name}</p>
                  <p className="text-xs text-mut">
                    Source: {ev.source || 'admin'} &middot; {ev.venue || '—'}
                  </p>
                </div>
              ),
            },
            { key: 'event_date', label: 'Date' },
            { key: 'status', label: 'Status', render: (ev) => <Badge>{ev.status}</Badge> },
            {
              key: 'tracking',
              label: 'Tracking Config',
              render: (ev) => (
                <span className="text-xs text-mut">
                  {ev.late_tracking ? 'Late' : 'No Late'} &middot;{' '}
                  {ev.penalty_tracking ? `₱${ev.absent_fee || 0} Absent` : 'No Penalty'}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Configure',
              render: (ev) => (
                <Button variant="secondary" size="sm" onClick={() => openConfigure(ev)}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Configure
                </Button>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        title={form.id ? 'Configure Event Tracking' : 'Add CSG Event'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="officer-event-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save Event'}
            </Button>
          </>
        }
      >
        <form id="officer-event-form" onSubmit={handleSave} className="space-y-3">
          <Input
            label="Event Name"
            id="oe-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              id="oe-date"
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
            <Input
              label="Time"
              id="oe-time"
              type="time"
              value={form.event_time}
              onChange={(e) => setForm({ ...form, event_time: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Venue"
              id="oe-venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
            <Select
              label="Status"
              id="oe-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Active">Active</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Past">Past</option>
            </Select>
          </div>
          <Textarea
            label="Description"
            id="oe-desc"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2 text-xs">
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
                checked={form.show_on_calendar}
                onChange={(e) => setForm({ ...form, show_on_calendar: e.target.checked })}
              />
              Show on calendar
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Late Fee (₱)"
              id="oe-late"
              type="number"
              min="0"
              value={form.late_fee}
              onChange={(e) => setForm({ ...form, late_fee: e.target.value })}
            />
            <Input
              label="Absent Fee (₱)"
              id="oe-abs"
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