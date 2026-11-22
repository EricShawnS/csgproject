import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchStudents, syncStudentsFromEnrollment } from '../../services/studentsService';
import { Badge, Button, Table, Toast } from '../../components/ui';

export default function StudentRecords() {
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchStudents();
      setStudents(data);
    } catch (err) {
      setError(err.message || 'Failed to load student records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncStudentsFromEnrollment(actor);
      setStudents(res.students);
      showToast(`Enrollment sync complete (${res.syncedCount} record(s)).`);
    } catch (err) {
      showToast(err.message || 'Enrollment sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? students.filter(
        (s) =>
          String(s.id || '').toLowerCase().includes(q) ||
          String(s.full_name || '').toLowerCase().includes(q) ||
          String(s.course || '').toLowerCase().includes(q) ||
          String(s.section || '').toLowerCase().includes(q)
      )
    : students;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mut" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, name, course, or section"
            aria-label="Search student records"
            className="w-full rounded-full border border-line bg-white py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-mut dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync from Enrollment'}
        </Button>

        <span className="text-xs text-mut dark:text-slate-400">
          Read-only enrollment roster; students are synced rather than manually added.
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading student records...</p>
      ) : (
        <Table
          keyField="id"
          rows={filtered}
          emptyMessage="No student records match your search."
          columns={[
            { key: 'id', label: 'Student ID' },
            {
              key: 'full_name',
              label: 'Full Name',
              render: (s) => <span className="font-semibold text-ink dark:text-white">{s.full_name}</span>,
            },
            { key: 'course', label: 'Course' },
            { key: 'year_level', label: 'Year Level' },
            { key: 'section', label: 'Section' },
            {
              key: 'enrollment_status',
              label: 'Enrollment Status',
              render: (s) => <Badge>{s.enrollment_status || 'Enrolled'}</Badge>,
            },
          ]}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}