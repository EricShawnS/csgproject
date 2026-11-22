import { useEffect, useState } from 'react';
import { Plus, Pencil, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchAnnouncements, saveAnnouncement } from '../../services/announcementsService';
import { Badge, Button, Input, Modal, Select, Table, Textarea, Toast } from '../../components/ui';

const STATUS_TABS = ['All', 'Published', 'Draft', 'Archived'];

const EMPTY_ANN = {
  id: null,
  title: '',
  body: '',
  status: 'Draft',
  ann_date: new Date().toISOString().split('T')[0],
  is_pinned: false,
};

export default function Announcements() {
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_ANN);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAnnouncements();
      setItems(data);
    } catch (err) {
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm({ ...EMPTY_ANN, ann_date: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setForm({
      id: item.id,
      title: item.title || '',
      body: item.body || '',
      status: item.status || (item.is_archived ? 'Archived' : 'Published'),
      ann_date: item.ann_date || new Date().toISOString().split('T')[0],
      is_pinned: Boolean(item.is_pinned),
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await saveAnnouncement(form, actor);
      showToast(
        form.status === 'Published'
          ? 'Announcement published to CSG Tracker.'
          : `Announcement saved as ${form.status}.`
      );
      setModalOpen(false);
      await load();
    } catch (err) {
      showToast(err.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickPublish = async (item) => {
    setSaving(true);
    try {
      await saveAnnouncement({ ...item, status: 'Published' }, actor);
      showToast('Announcement published.');
      await load();
    } catch (err) {
      showToast(err.message || 'Failed to publish.');
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    tab === 'All'
      ? items
      : items.filter((a) => (a.status || (a.is_archived ? 'Archived' : 'Published')) === tab);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Create Announcement
        </Button>

        <div className="inline-flex rounded-xl border border-line bg-soft/60 p-1 dark:border-slate-800 dark:bg-slate-900">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                tab === t
                  ? 'bg-admin-active text-white'
                  : 'text-mut hover:text-ink dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading announcements...</p>
      ) : (
        <Table
          keyField="id"
          rows={filtered}
          emptyMessage="No announcements in this view."
          columns={[
            {
              key: 'title',
              label: 'Announcement',
              render: (a) => (
                <div>
                  <p className="font-semibold text-ink dark:text-white">{a.title}</p>
                  {a.body && (
                    <p className="line-clamp-1 text-xs text-mut dark:text-slate-400">{a.body}</p>
                  )}
                </div>
              ),
            },
            { key: 'sender', label: 'Sender' },
            { key: 'ann_date', label: 'Date' },
            {
              key: 'status',
              label: 'Status',
              render: (a) => <Badge>{a.status || 'Published'}</Badge>,
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (a) => (
                <div className="flex items-center gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {a.status !== 'Published' && (
                    <Button size="sm" disabled={saving} onClick={() => handleQuickPublish(a)}>
                      <Send className="h-3.5 w-3.5" />
                      Publish
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        title={form.id ? 'Edit Announcement' : 'Create Announcement'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="ann-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save Announcement'}
            </Button>
          </>
        }
      >
        <form id="ann-form" onSubmit={handleSave} className="space-y-3">
          <Input
            label="Title"
            id="ann-title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Announcement headline"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="State"
              id="ann-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Draft">Save as Draft</option>
              <option value="Published">Publish Immediately</option>
              <option value="Archived">Archive</option>
            </Select>
            <Input
              label="Date"
              id="ann-date"
              type="date"
              value={form.ann_date}
              onChange={(e) => setForm({ ...form, ann_date: e.target.value })}
            />
          </div>
          <Textarea
            label="Message Body"
            id="ann-body"
            rows={4}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Write the official announcement..."
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
            />
            Pin announcement to top
          </label>
        </form>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}