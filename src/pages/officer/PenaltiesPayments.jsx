import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchStudents } from '../../services/studentsService';
import { fetchEvents } from '../../services/eventsService';
import { fetchAllAttendance } from '../../services/attendanceService';
import { fetchPayments, recordPayment } from '../../services/paymentsService';
import { Badge, Button, Input, Modal, Select, Table, Toast } from '../../components/ui';

export default function PenaltiesPayments() {
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [targetRow, setTargetRow] = useState(null);
  const [amount, setAmount] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [proofName, setProofName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [st, ev, att, pay] = await Promise.all([
        fetchStudents(),
        fetchEvents(),
        fetchAllAttendance(),
        fetchPayments(),
      ]);
      setStudents(st);
      setEvents(ev);
      setAttendance(att);
      setPayments(pay);
    } catch (err) {
      setError(err.message || 'Failed to load penalties and payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const eventMap = Object.fromEntries(events.map((e) => [String(e.id), e]));

  // Compute penalty & balance per student based on attendance and event fees
  const computedRows = students.map((st) => {
    const stAtt = attendance.filter((a) => a.student_id === st.id);
    let penaltyTotal = 0;

    stAtt.forEach((a) => {
      const ev = eventMap[String(a.event_id)];
      if (!ev || ev.penalty_tracking === false) return;
      if (a.status === 'Absent') penaltyTotal += Number(ev.absent_fee || 0);
      if (a.status === 'Late') penaltyTotal += Number(ev.late_fee || 0);
      // Excused prevents/removes penalty
    });

    const paidTotal = payments
      .filter((p) => p.student_id === st.id)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const balance = Math.max(0, penaltyTotal - paidTotal);

    let status = 'Paid';
    if (penaltyTotal === 0 && paidTotal === 0) {
      status = 'Excused';
    } else if (balance <= 0) {
      status = 'Paid';
    } else if (paidTotal > 0) {
      status = 'Partially Paid';
    } else {
      status = 'Unpaid';
    }

    return {
      id: st.id,
      studentName: st.full_name,
      courseSection: `${st.course || '—'} · ${st.year_level || ''} ${st.section || ''}`.trim(),
      penaltyTotal,
      paidTotal,
      balance,
      status,
    };
  });

  const filteredRows =
    statusFilter === 'All'
      ? computedRows
      : computedRows.filter((r) => r.status === statusFilter);

  const openPaymentModal = (row) => {
    setTargetRow(row);
    setAmount(row.balance > 0 ? String(row.balance) : '');
    setReferenceNo('');
    setProofName('');
    setModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!targetRow || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await recordPayment(
        {
          studentId: targetRow.id,
          amount: Number(amount),
          referenceNo,
          proofName,
        },
        actor
      );
      showToast('Payment recorded and balance updated.');
      setModalOpen(false);
      await loadAll();
    } catch (err) {
      showToast(err.message || 'Could not record payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select
            label="Filter by Status"
            id="pen-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Excused">Excused</option>
          </Select>
        </div>
        <span className="pt-4 text-xs text-mut">
          Approved excuses prevent penalties; recording a payment updates balances automatically.
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading penalties and payments...</p>
      ) : (
        <Table
          keyField="id"
          rows={filteredRows}
          emptyMessage="No student penalty records found."
          columns={[
            { key: 'id', label: 'ID' },
            {
              key: 'studentName',
              label: 'Student',
              render: (r) => <span className="font-semibold">{r.studentName}</span>,
            },
            { key: 'courseSection', label: 'Course / Section' },
            {
              key: 'penaltyTotal',
              label: 'Penalties',
              render: (r) => `₱${r.penaltyTotal.toLocaleString()}`,
            },
            {
              key: 'paidTotal',
              label: 'Paid',
              render: (r) => `₱${r.paidTotal.toLocaleString()}`,
            },
            {
              key: 'balance',
              label: 'Balance',
              render: (r) => <span className="font-bold">₱{r.balance.toLocaleString()}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <Badge tone={r.status === 'Paid' ? 'Approved' : r.status === 'Unpaid' ? 'Rejected' : 'Pending'}>{r.status}</Badge>,
            },
            {
              key: 'actions',
              label: 'Action',
              render: (r) => (
                <Button variant="secondary" size="sm" onClick={() => openPaymentModal(r)}>
                  <Wallet className="h-3.5 w-3.5" />
                  Record Payment
                </Button>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        title="Record Payment"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="payment-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save Payment'}
            </Button>
          </>
        }
      >
        <form id="payment-form" onSubmit={handleSavePayment} className="space-y-3">
          {targetRow && (
            <p className="text-xs text-mut">
              Student: <strong className="text-ink dark:text-white">{targetRow.studentName}</strong> ({targetRow.id}) · Current Balance:{' '}
              <strong className="text-ink dark:text-white">₱{targetRow.balance.toLocaleString()}</strong>
            </p>
          )}
          <Input
            label="Amount (₱)"
            id="pay-amount"
            type="number"
            min="1"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Reference Number (optional)"
            id="pay-ref"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder="Auto-generated if left blank"
          />
          <div>
            <label htmlFor="pay-proof" className="mb-1 block text-xs font-semibold">
              Proof of Payment
            </label>
            <input
              id="pay-proof"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setProofName(e.target.files?.[0]?.name || '')}
              className="w-full rounded-lg border border-line bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </form>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}