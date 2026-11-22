import { useEffect, useState } from 'react';
import { FileDown, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchEvents } from '../../services/eventsService';
import { fetchStudents } from '../../services/studentsService';
import { fetchReportBundle, recordReportExport } from '../../services/reportsService';
import { fetchPayments } from '../../services/paymentsService';
import { Button, Card, Select, Table, Toast } from '../../components/ui';

export default function Reports() {
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [reportType, setReportType] = useState('attendance');
  const [eventId, setEventId] = useState('All');
  const [studentId, setStudentId] = useState('All');
  const [rows, setRows] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    Promise.all([fetchEvents(), fetchStudents()])
      .then(([ev, st]) => {
        setEvents(ev);
        setStudents(st);
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (reportType === 'payments') {
        const payList = await fetchPayments();
        const filteredPay =
          studentId === 'All' ? payList : payList.filter((p) => p.student_id === studentId);
        setRows(
          filteredPay.map((p) => ({
            id: p.id,
            reference_no: p.reference_no || '—',
            student_id: p.student_id,
            payment_date: p.payment_date || '—',
            amount: `₱${Number(p.amount || 0).toLocaleString()}`,
            proof_name: p.proof_name || '—',
          }))
        );
      } else {
        const mappedType = reportType === 'history' ? 'student_history' : reportType;
        const data = await fetchReportBundle({ reportType: mappedType, eventId });
        const filtered =
          studentId === 'All'
            ? data
            : data.filter((r) => (r.studentId || r.id) === studentId);
        setRows(filtered);
      }
      setGenerated(true);
    } catch (err) {
      showToast(err.message || 'Could not generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    await recordReportExport(`officer_${reportType}`, rows.length, actor);
    showToast('Opening print/PDF export...');
    window.print();
  };

  const columnsByType = {
    attendance: [
      { key: 'studentId', label: 'ID' },
      { key: 'studentName', label: 'Student' },
      { key: 'eventName', label: 'Event' },
      { key: 'status', label: 'Status' },
      { key: 'recordedTime', label: 'Time' },
    ],
    payments: [
      { key: 'reference_no', label: 'Reference' },
      { key: 'student_id', label: 'Student ID' },
      { key: 'payment_date', label: 'Date' },
      { key: 'amount', label: 'Amount' },
      { key: 'proof_name', label: 'Proof' },
    ],
    history: [
      { key: 'id', label: 'ID' },
      { key: 'studentName', label: 'Student' },
      { key: 'present', label: 'Present' },
      { key: 'late', label: 'Late' },
      { key: 'absent', label: 'Absent' },
      { key: 'excused', label: 'Excused' },
    ],
    events: [
      { key: 'name', label: 'Event' },
      { key: 'date', label: 'Date' },
      { key: 'venue', label: 'Venue' },
      { key: 'present', label: 'Present' },
      { key: 'absent', label: 'Absent' },
      { key: 'excused', label: 'Excused' },
    ],
  };

  return (
    <div className="space-y-4">
      <Card className="no-print">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Report Type"
            id="off-rep-type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="attendance">Attendance Report</option>
            <option value="payments">Payment Report</option>
            <option value="history">Student History</option>
            <option value="events">Event Report</option>
          </Select>

          <Select
            label="Event"
            id="off-rep-event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="All">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </Select>

          <Select
            label="Student"
            id="off-rep-student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="All">All Students</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.full_name} ({st.id})
              </option>
            ))}
          </Select>

          <div className="flex items-end gap-2">
            <Button onClick={handleGenerate} disabled={loading} className="flex-1">
              <BarChart3 className="h-4 w-4" />
              {loading ? 'Generating...' : 'Generate'}
            </Button>
            <Button variant="secondary" onClick={handleExportPdf} disabled={!generated}>
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Report Output">
        {!generated ? (
          <p className="py-6 text-center text-sm text-mut">
            Choose a report type, then click Generate.
          </p>
        ) : (
          <Table
            keyField="id"
            rows={rows}
            columns={columnsByType[reportType] || columnsByType.attendance}
            emptyMessage="No records found for this report selection."
          />
        )}
      </Card>

      <Toast message={toast} />
    </div>
  );
}