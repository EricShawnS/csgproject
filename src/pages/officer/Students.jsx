import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  FileText,
  SlidersHorizontal,
  User,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchStudents } from '../../services/studentsService';
import { fetchAllAttendance } from '../../services/attendanceService';
import { fetchEvents } from '../../services/eventsService';
import { fetchPayments, recordPayment } from '../../services/paymentsService';
import { Button, Input, Modal, Toast } from '../../components/ui';

const PAGE_SIZE = 10;
const TABS = ['Penalty Details', 'Payment History', 'Proof of Payments'];

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

function StatusPill({ paid }) {
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
        paid ? 'bg-[#bdeebd] text-[#14532d]' : 'bg-abs/30 text-[#7f1d1d] dark:text-red-200'
      }`}
    >
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  );
}

function Avatar({ size = 'sm' }) {
  const dims = size === 'lg' ? 'h-16 w-16' : 'h-7 w-7';
  const icon = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4';
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-soft text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${dims}`}
    >
      <User className={icon} />
    </span>
  );
}

function buildPenalties(studentAtt, eventsById, totalPaid) {
  const items = studentAtt
    .filter((a) => a.status === 'Late' || a.status === 'Absent')
    .map((a) => {
      const ev = eventsById[String(a.event_id)];
      if (!ev || !ev.penalty_tracking) return null;
      const amount = Number(a.status === 'Late' ? ev.late_fee : ev.absent_fee) || 0;
      if (amount <= 0) return null;
      return {
        id: `${a.event_id}-${a.student_id}`,
        date: ev.event_date,
        type: a.status,
        reason: a.status === 'Late' ? `Late – ${ev.name}` : `Absent – ${ev.name}`,
        amount,
      };
    })
    .filter(Boolean)
    .sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')));

  let credit = totalPaid;
  const withStatus = items.map((p) => {
    const paid = credit >= p.amount;
    if (paid) credit -= p.amount;
    return { ...p, paid };
  });

  return withStatus.reverse();
}

export default function Students() {
  const { headerSearch = '' } = useOutletContext() || {};
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState(TABS[0]);

  const [showFilters, setShowFilters] = useState(false);
  const [courseFilter, setCourseFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', referenceNo: '', proofName: '' });
  const [paySaving, setPaySaving] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStudents(), fetchAllAttendance(), fetchPayments(), fetchEvents()])
      .then(([st, att, pay, ev]) => {
        setStudents(st);
        setAttendance(att);
        setPayments(pay);
        setEvents(ev);
        if (st.length > 0) setSelectedId(st[0].id);
        setError('');
      })
      .catch((err) => setError(err.message || 'Failed to load students.'))
      .finally(() => setLoading(false));
  }, []);

  const eventsById = useMemo(
    () => Object.fromEntries(events.map((e) => [String(e.id), e])),
    [events]
  );

  const financeByStudent = useMemo(() => {
    const paidBy = {};
    payments.forEach((p) => {
      if (p.status === 'Paid') paidBy[p.student_id] = (paidBy[p.student_id] || 0) + Number(p.amount || 0);
    });
    const attBy = {};
    attendance.forEach((a) => {
      (attBy[a.student_id] ||= []).push(a);
    });
    const out = {};
    students.forEach((s) => {
      const paid = paidBy[s.id] || 0;
      const penalties = buildPenalties(attBy[s.id] || [], eventsById, paid);
      const total = penalties.reduce((sum, p) => sum + p.amount, 0);
      out[s.id] = { penalties, total, paid, balance: Math.max(total - paid, 0) };
    });
    return out;
  }, [students, attendance, payments, eventsById]);

  const courses = useMemo(
    () => [...new Set(students.map((s) => s.course).filter(Boolean))].sort(),
    [students]
  );
  const years = useMemo(
    () => [...new Set(students.map((s) => s.year_level).filter(Boolean))].sort(),
    [students]
  );

  const q = headerSearch.trim().toLowerCase();
  const filtered = students.filter((s) => {
    if (courseFilter && s.course !== courseFilter) return false;
    if (yearFilter && s.year_level !== yearFilter) return false;
    if (!q) return true;
    return (
      String(s.id || '').toLowerCase().includes(q) ||
      String(s.full_name || '').toLowerCase().includes(q) ||
      String(s.course || '').toLowerCase().includes(q) ||
      String(s.section || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [q, courseFilter, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  const windowStart = Math.max(1, Math.min(safePage - 2, totalPages - 4));
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => windowStart + i
  );

  const allOnPageChecked = pageRows.length > 0 && pageRows.every((s) => checkedIds.has(s.id));
  const togglePage = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      pageRows.forEach((s) => (allOnPageChecked ? next.delete(s.id) : next.add(s.id)));
      return next;
    });
  };
  const toggleOne = (id) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selected = students.find((s) => s.id === selectedId) || null;
  const fin = selected ? financeByStudent[selected.id] : null;
  const selectedPayments = selected ? payments.filter((p) => p.student_id === selected.id) : [];
  const selectedProofs = selectedPayments.filter((p) => p.proof_name);
  const lateCount = fin ? fin.penalties.filter((p) => p.type === 'Late').length : 0;
  const absentCount = fin ? fin.penalties.filter((p) => p.type === 'Absent').length : 0;

  const openProfile = (id) => {
    setSelectedId(id);
    setTab(TABS[0]);
  };

  const submitPayment = async () => {
    if (!selected) return;
    const amt = Number(payForm.amount);
    if (!amt || amt <= 0) {
      showToast('Enter a payment amount greater than zero.');
      return;
    }
    setPaySaving(true);
    try {
      const saved = await recordPayment(
        {
          studentId: selected.id,
          amount: amt,
          referenceNo: payForm.referenceNo,
          proofName: payForm.proofName,
        },
        actor
      );
      setPayments((prev) => [saved, ...prev]);
      setPayOpen(false);
      setPayForm({ amount: '', referenceNo: '', proofName: '' });
      showToast(`Recorded ${peso(amt)} payment for ${selected.full_name}.`);
    } catch (err) {
      showToast(err.message || 'Could not record payment.');
    } finally {
      setPaySaving(false);
    }
  };

  const th = 'px-3.5 py-2.5 text-xs font-semibold text-ink dark:text-slate-200';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-xs text-mut">Manage and review student records</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filter students"
            aria-expanded={showFilters}
            className="rounded-lg border border-line bg-white p-2 text-ink hover:bg-soft dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          {showFilters && (
            <div className="absolute right-0 top-11 z-20 w-56 space-y-2.5 rounded-xl border border-line bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <label className="block text-xs font-semibold text-ink dark:text-slate-200">
                Course
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">All courses</option>
                  {courses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink dark:text-slate-200">
                Year level
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">All years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              {(courseFilter || yearFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setCourseFilter('');
                    setYearFilter('');
                  }}
                  className="text-xs font-semibold text-admin-active hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading students...</p>
      ) : (
        <div
          className={`grid grid-cols-1 gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : ''}`}
        >
          <div className="self-start rounded-xl border border-line bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line dark:border-slate-800">
                    <th className="w-10 px-3.5 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Select all students on this page"
                        checked={allOnPageChecked}
                        onChange={togglePage}
                        className="h-4 w-4 rounded border-line"
                      />
                    </th>
                    <th className={th}>Student ID</th>
                    <th className={th}>Full Name</th>
                    <th className={th}>Course</th>
                    <th className={th}>Year Level</th>
                    <th className={th}>Balance</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-mut">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((s) => {
                      const isSel = s.id === selectedId;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => openProfile(s.id)}
                          aria-selected={isSel}
                          className={`cursor-pointer border-b border-line/70 last:border-b-0 dark:border-slate-800 ${
                            isSel
                              ? 'bg-soft/70 outline outline-1 -outline-offset-1 outline-slate-400 dark:bg-slate-800/70'
                              : 'hover:bg-soft/40 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${s.full_name}`}
                              checked={checkedIds.has(s.id)}
                              onChange={() => toggleOne(s.id)}
                              className="h-4 w-4 rounded border-line"
                            />
                          </td>
                          <td className="px-3.5 py-3 text-xs">{s.id}</td>
                          <td className="px-3.5 py-3">
                            <span className="flex items-center gap-2.5 text-xs font-medium">
                              <Avatar />
                              {s.full_name}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-xs">{s.course || '—'}</td>
                          <td className="px-3.5 py-3 text-xs">{s.year_level || '—'}</td>
                          <td className="px-3.5 py-3 text-xs">
                            {peso(financeByStudent[s.id]?.balance)}
                          </td>
                          <td className="pr-3 text-mut">
                            <button
                              type="button"
                              aria-label={`Open profile of ${s.full_name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openProfile(s.id);
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3.5 py-3 dark:border-slate-800">
              <p className="text-[11px] text-mut">
                {filtered.length === 0
                  ? 'Showing 0 students'
                  : `Showing ${startIdx + 1} - ${startIdx + pageRows.length} of ${filtered.length} students`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage === 1}
                  onClick={() => setPage(safePage - 1)}
                  className="rounded-md border border-line p-1 disabled:opacity-40 dark:border-slate-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === safePage ? 'page' : undefined}
                    className={`h-6 min-w-6 rounded-md px-1.5 text-[11px] font-semibold ${
                      n === safePage
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'text-ink hover:bg-soft dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={safePage === totalPages}
                  onClick={() => setPage(safePage + 1)}
                  className="rounded-md border border-line p-1 disabled:opacity-40 dark:border-slate-700"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {selected && fin && (
            <aside
              aria-label="Mini profile"
              className="self-start rounded-xl border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink dark:text-white">Mini Profile</h2>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close profile"
                  className="rounded-lg p-1 text-mut hover:bg-soft hover:text-ink dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Avatar size="lg" />
                <div className="min-w-0 text-xs">
                  <p className="truncate text-sm font-bold text-ink dark:text-white">
                    {selected.full_name}
                  </p>
                  <p className="text-mut">{selected.id}</p>
                  <p className="text-mut">
                    {selected.course || '—'} · {selected.year_level || '—'}
                    {selected.section ? ` · Sec ${selected.section}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-xl border border-line py-2.5 text-center dark:divide-slate-800 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-semibold text-ink dark:text-slate-200">Total Penalty</p>
                  <p className="text-base font-bold text-ink dark:text-white">{peso(fin.total)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-mut">Paid</p>
                  <p className="text-base font-bold text-[#15803d]">{peso(fin.paid)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-mut">Remaining Balance</p>
                  <p className="text-base font-bold text-red">{peso(fin.balance)}</p>
                </div>
              </div>

              <div
                role="tablist"
                className="mt-3 grid grid-cols-3 border-b border-line text-center dark:border-slate-800"
              >
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`-mb-px border-b-2 px-1 py-2 text-[11px] font-semibold ${
                      tab === t
                        ? 'border-black text-ink dark:border-white dark:text-white'
                        : 'border-transparent text-mut hover:text-ink dark:hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-3 space-y-3">
                {tab === 'Penalty Details' && (
                  <>
                    <div className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line py-2.5 dark:divide-slate-800 dark:border-slate-800">
                      {[
                        { label: 'Late', value: lateCount, icon: Clock },
                        { label: 'Absent', value: absentCount, icon: XCircle },
                        { label: 'Total Penalty', value: peso(fin.total), icon: Coins },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-2 px-3">
                          <Icon className="h-4 w-4 shrink-0 text-mut" />
                          <div className="text-[10px] text-mut">
                            {label}
                            <p className="text-sm font-bold text-ink dark:text-white">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <h3 className="text-xs font-bold text-ink dark:text-white">Penalty Records</h3>
                    <MiniTable
                      headers={['Date', 'Type', 'Reason', 'Amount', 'Status']}
                      empty="No penalties recorded."
                      rows={fin.penalties.map((p) => [
                        formatDate(p.date),
                        p.type,
                        p.reason,
                        peso(p.amount),
                        <StatusPill key="s" paid={p.paid} />,
                      ])}
                    />
                  </>
                )}

                {tab === 'Payment History' && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-ink dark:text-white">Payment History</h3>
                      <Button size="sm" variant="secondary" onClick={() => setPayOpen(true)}>
                        <Wallet className="h-3.5 w-3.5" />
                        Add Payment
                      </Button>
                    </div>
                    <MiniTable
                      headers={['Payment Date', 'Reference No.', 'Amount Paid', 'Status']}
                      empty="No payments yet."
                      rows={selectedPayments.map((p) => [
                        formatDate(p.payment_date),
                        p.reference_no || '—',
                        peso(p.amount),
                        <StatusPill key="s" paid={p.status === 'Paid'} />,
                      ])}
                    />
                  </>
                )}

                {tab === 'Proof of Payments' && (
                  <>
                    <h3 className="text-xs font-bold text-ink dark:text-white">Proof of Payments</h3>
                    {selectedProofs.length === 0 ? (
                      <p className="rounded-lg border border-line py-6 text-center text-xs text-mut dark:border-slate-800">
                        No proof of payment uploaded.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedProofs.map((p) => (
                          <div
                            key={p.id}
                            className="rounded-lg border border-line p-2.5 text-[10px] text-mut dark:border-slate-800"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-6 w-6 shrink-0" />
                              <div className="min-w-0">
                                <p>{formatDate(p.payment_date)}</p>
                                <p className="truncate">{p.reference_no}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-2 w-full bg-white"
                              onClick={() => showToast(`Proof file: ${p.proof_name}`)}
                            >
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <Button
                variant="secondary"
                className="mt-4 w-full bg-white"
                onClick={() => setSelectedId(null)}
              >
                Close Profile
              </Button>
            </aside>
          )}
        </div>
      )}

      <Modal
        open={payOpen}
        title={`Add payment${selected ? ` – ${selected.full_name}` : ''}`}
        onClose={() => setPayOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPayment} disabled={paySaving}>
              {paySaving ? 'Saving...' : 'Save payment'}
            </Button>
          </>
        }
      >
        <Input
          id="pay-amount"
          label="Amount (₱)"
          type="number"
          min="0"
          value={payForm.amount}
          onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
        />
        <Input
          id="pay-ref"
          label="Reference No. (optional)"
          value={payForm.referenceNo}
          onChange={(e) => setPayForm((f) => ({ ...f, referenceNo: e.target.value }))}
        />
        <Input
          id="pay-proof"
          label="Proof file name (optional)"
          value={payForm.proofName}
          onChange={(e) => setPayForm((f) => ({ ...f, proofName: e.target.value }))}
        />
      </Modal>

      <Toast message={toast} />
    </div>
  );
}

function MiniTable({ headers, rows, empty }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line dark:border-slate-800">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="bg-soft/60 text-mut dark:bg-slate-800/60">
            {headers.map((h) => (
              <th key={h} className="px-2.5 py-1.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-2.5 py-5 text-center text-mut">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr key={i}>
                {cells.map((c, j) => (
                  <td key={j} className="px-2.5 py-2 align-middle">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
