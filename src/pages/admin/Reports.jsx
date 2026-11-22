import { useEffect, useState } from 'react';
import { FileDown, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchEvents } from '../../services/eventsService';
import { fetchReportBundle, recordReportExport } from '../../services/reportsService';
import { Button, Card, Input, Select, Table, Toast } from '../../components/ui';

export default function Reports() {
  const { user, profile, role } = useAuth();
  const actor = { id: user?.id, name: profile?.full_name || user?.email, role };

  const [events, setEvents] = useState([]);
  const [reportType, setReportType] = useState('attendance');
  const [eventId, setEventId] = useState('All');
  const [course, setCourse] = useState('All');
  const [yearLevel, setYearLevel] = useState('All');
  const [section, setSection] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [rows, setRows] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchReportBundle({
        reportType,
        eventId,
        course,
        yearLevel,
        section,
        dateFrom,
        dateTo,
      });
      setRows(data);
      setGenerated(true);
    } catch (err) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    await recordReportExport(reportType, rows.length, actor);
    showToast('Preparing print/PDF preview...');
    window.print();
  };

  const columnsByType = {
    attendance: [
      { key: 'studentId', label: 'ID' },
      { key: 'studentName', label: 'Student' },
      { key: 'courseSection', label: 'Course / Year' },
      { key: 'eventName', label: 'Event' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status' },
    ],
    events: [
      { key: 'name', label: 'Event' },
      { key: 'date', label: 'Date' },
      { key: 'venue', label: 'Venue' },
      { key: 'present', label: 'Present' },
      { key: 'late', label: 'Late' },
      { key: 'absent', label: 'Absent' },
      { key: 'excused', label: 'Excused' },
    ],
    excuses: [
      { key: 'studentName', label: 'Student' },
      { key: 'courseSection', label: 'Course / Section' },
      { key: 'eventName', label: 'Event' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Decision' },
      { key: 'decidedBy', label: 'Decided By' },
      { key: 'remarks', label: 'Remarks' },
    ],
    student_history: [
      { key: 'id', label: 'ID' },
      { key: 'studentName', label: 'Student' },
      { key: 'course', label: 'Course' },
      { key: 'yearSection', label: 'Year & Section' },
      { key: 'present', label: 'Present' },
      { key: 'late', label: 'Late' },
      { key: 'absent', label: 'Absent' },
      { key: 'excused', label: 'Excused' },
    ],
  };

  return (
    <div className="space-y-4">
      <Card title="Report Filters" className="no-print">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Report Type"
            id="rep-type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="attendance">Attendance Summary</option>
            <option value="events">Event Report</option>
            <option value="excuses">Excuse-Decision Report</option>
            <option value="student_history">Student History Report</option>
          </Select>

          <Select
            label="Event"
            id="rep-event"
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

          <Input
            label="Course (or All)"
            id="rep-course"
            value={course === 'All' ? '' : course}
            onChange={(e) => setCourse(e.target.value.trim() ? e.target.value : 'All')}
            placeholder="All courses"
          />

          <Input
            label="Year Level (or All)"
            id="rep-year"
            value={yearLevel === 'All' ? '' : yearLevel}
            onChange={(e) => setYearLevel(e.target.value.trim() ? e.target.value : 'All')}
            placeholder="All year levels"
          />

          <Input
            label="Section (or All)"
            id="rep-section"
            value={section === 'All' ? '' : section}
            onChange={(e) => setSection(e.target.value.trim() ? e.target.value : 'All')}
            placeholder="All sections"
          />

          <Input
            label="From Date"
            id="rep-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <Input
            label="To Date"
            id="rep-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

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

      {error && (
        <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red">{error}</div>
      )}

      <Card
        title="Report Preview"
        subtitle={
          generated
            ? `${rows.length} record(s) matching current filters`
            : 'Configure filters above and click Generate to preview report data.'
        }
      >
        {!generated ? (
          <p className="py-6 text-center text-sm text-mut">No report generated yet.</p>
        ) : (
          <Table
            keyField="id"
            rows={rows}
            columns={columnsByType[reportType] || columnsByType.attendance}
            emptyMessage="No matching records found for the selected filters."
          />
        )}
      </Card>

      <Toast message={toast} />
    </div>
  );
}