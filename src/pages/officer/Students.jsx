import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchStudents } from '../../services/studentsService';
import { fetchAllAttendance } from '../../services/attendanceService';
import { fetchPayments } from '../../services/paymentsService';
import { Badge, Card, Table } from '../../components/ui';

export default function Students() {
  const { headerSearch = '' } = useOutletContext() || {};
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStudents(), fetchAllAttendance(), fetchPayments()])
      .then(([st, att, pay]) => {
        setStudents(st);
        setAttendance(att);
        setPayments(pay);
        if (st.length > 0) setSelectedStudent(st[0]);
        setError('');
      })
      .catch((err) => setError(err.message || 'Failed to load students.'))
      .finally(() => setLoading(false));
  }, []);

  const q = headerSearch.trim().toLowerCase();
  const filtered = q
    ? students.filter(
        (s) =>
          String(s.id || '').toLowerCase().includes(q) ||
          String(s.full_name || '').toLowerCase().includes(q) ||
          String(s.course || '').toLowerCase().includes(q) ||
          String(s.section || '').toLowerCase().includes(q)
      )
    : students;

  const studentAtt = selectedStudent
    ? attendance.filter((a) => a.student_id === selectedStudent.id)
    : [];
  const studentPay = selectedStudent
    ? payments.filter((p) => p.student_id === selectedStudent.id)
    : [];
  const totalPaid = studentPay.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-mut">
        Student records come from the school&apos;s enrollment records. Select a row to inspect attendance and payment summary.
      </p>

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-mut">Loading students...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Table
              keyField="id"
              rows={filtered}
              emptyMessage="No students found."
              columns={[
                { key: 'id', label: 'Student ID' },
                {
                  key: 'full_name',
                  label: 'Name',
                  render: (s) => (
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(s)}
                      className="text-left font-semibold text-admin-active hover:underline"
                    >
                      {s.full_name}
                    </button>
                  ),
                },
                { key: 'course', label: 'Course' },
                { key: 'year_level', label: 'Year' },
                { key: 'section', label: 'Section' },
                {
                  key: 'enrollment_status',
                  label: 'Status',
                  render: (s) => <Badge>{s.enrollment_status || 'Enrolled'}</Badge>,
                },
              ]}
            />
          </div>

          <Card title="Student Summary">
            {!selectedStudent ? (
              <p className="text-xs text-mut">Select a student to view details.</p>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">
                    {selectedStudent.full_name}
                  </p>
                  <p className="text-mut">ID: {selectedStudent.id}</p>
                  <p className="text-mut">
                    {selectedStudent.course || '—'} · {selectedStudent.year_level || '—'}{' '}
                    {selectedStudent.section || ''}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg bg-soft/60 p-2.5 dark:bg-slate-800/60">
                  <div>
                    <span className="text-mut">Present</span>
                    <p className="font-bold">
                      {studentAtt.filter((a) => a.status === 'Present').length}
                    </p>
                  </div>
                  <div>
                    <span className="text-mut">Absent</span>
                    <p className="font-bold">
                      {studentAtt.filter((a) => a.status === 'Absent').length}
                    </p>
                  </div>
                  <div>
                    <span className="text-mut">Excused</span>
                    <p className="font-bold">
                      {studentAtt.filter((a) => a.status === 'Excused').length}
                    </p>
                  </div>
                  <div>
                    <span className="text-mut">Paid Total</span>
                    <p className="font-bold">₱{totalPaid.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}