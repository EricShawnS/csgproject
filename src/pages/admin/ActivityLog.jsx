import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchActivityLogs } from '../../services/ActivityLogService';
import { Card, Input, Select, Table } from '../../components/ui';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchActivityLogs()
      .then((data) => {
        setLogs(data);
        setError('');
      })
      .catch((err) => setError(err.message || 'Failed to load activity log.'))
      .finally(() => setLoading(false));
  }, []);

  const modules = ['All', ...Array.from(new Set(logs.map((l) => l.module).filter(Boolean)))];
  const q = search.trim().toLowerCase();

  const filtered = logs.filter((l) => {
    if (moduleFilter !== 'All' && l.module !== moduleFilter) return false;
    if (dateFilter && l.created_at?.slice(0, 10) !== dateFilter) return false;
    if (!q) return true;
    return (
      String(l.actor_name || '').toLowerCase().includes(q) ||
      String(l.action || '').toLowerCase().includes(q) ||
      String(l.module || '').toLowerCase().includes(q) ||
      String(l.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="log-search" className="mb-1 block text-xs font-semibold text-ink dark:text-slate-200">
              Search User / Action / Description
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mut" />
              <input
                id="log-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="w-full rounded-lg border border-line bg-white py-1.5 pl-8 pr-3 text-sm text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <Select
            label="Module"
            id="log-module"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>

          <Input
            label="Date"
            id="log-date"
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
        <p className="text-sm text-mut">Loading read-only activity log...</p>
      ) : (
        <Table
          keyField="id"
          rows={filtered}
          emptyMessage="No activity log entries recorded yet."
          columns={[
            {
              key: 'created_at',
              label: 'Timestamp',
              render: (l) =>
                l.created_at ? new Date(l.created_at).toLocaleString() : '—',
            },
            { key: 'actor_name', label: 'User' },
            { key: 'action', label: 'Action' },
            { key: 'module', label: 'Module' },
            { key: 'description', label: 'Description' },
          ]}
        />
      )}
    </div>
  );
}