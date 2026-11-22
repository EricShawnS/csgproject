import { supabase } from '../lib/supabase';
import { logActivity } from './ActivityLogService';

export async function fetchReportBundle({ reportType, eventId, course, yearLevel, section, dateFrom, dateTo }) {
  const [eventsRes, studentsRes, attendanceRes, excusesRes] = await Promise.all([
    supabase.from('events').select('*').order('event_date', { ascending: false }),
    supabase.from('students').select('*').order('id', { ascending: true }),
    supabase.from('attendance').select('*'),
    supabase.from('excuse_requests').select('*'),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (studentsRes.error) throw studentsRes.error;
  if (attendanceRes.error) throw attendanceRes.error;
  if (excusesRes.error) throw excusesRes.error;

  const events = eventsRes.data || [];
  const students = studentsRes.data || [];
  const attendance = attendanceRes.data || [];
  const excuses = excusesRes.data || [];

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
  const eventMap = Object.fromEntries(events.map((e) => [String(e.id), e]));

  const matchesStudentFilters = (student) => {
    if (!student) return true;
    if (course && course !== 'All' && student.course !== course) return false;
    if (yearLevel && yearLevel !== 'All' && student.year_level !== yearLevel) return false;
    if (section && section !== 'All' && student.section !== section) return false;
    return true;
  };

  const matchesDateRange = (dateStr) => {
    if (!dateStr) return true;
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  };

  if (reportType === 'events') {
    return events
      .filter((ev) => (!eventId || eventId === 'All' || String(ev.id) === String(eventId)))
      .filter((ev) => matchesDateRange(ev.event_date))
      .map((ev) => {
        const evAtt = attendance.filter((a) => String(a.event_id) === String(ev.id));
        return {
          id: ev.id,
          name: ev.name,
          date: ev.event_date || '—',
          venue: ev.venue || '—',
          status: ev.status,
          present: evAtt.filter((a) => a.status === 'Present').length,
          late: evAtt.filter((a) => a.status === 'Late').length,
          absent: evAtt.filter((a) => a.status === 'Absent').length,
          excused: evAtt.filter((a) => a.status === 'Excused').length,
        };
      });
  }

  if (reportType === 'excuses') {
    return excuses
      .filter((ex) => (!eventId || eventId === 'All' || String(ex.event_id) === String(eventId)))
      .filter((ex) => matchesStudentFilters(studentMap[ex.student_id]))
      .filter((ex) => matchesDateRange(ex.created_at?.slice(0, 10)))
      .map((ex) => {
        const st = studentMap[ex.student_id];
        const ev = eventMap[String(ex.event_id)];
        return {
          id: ex.id,
          studentId: ex.student_id,
          studentName: st?.full_name || 'Unknown',
          courseSection: `${st?.course || '—'} · ${st?.year_level || ''} ${st?.section || ''}`.trim(),
          eventName: ev?.name || 'General / Unlinked',
          reason: ex.reason || '—',
          status: ex.status || 'Pending',
          decidedBy: ex.decided_by || '—',
          remarks: ex.remarks || '—',
        };
      });
  }

  if (reportType === 'student_history') {
    return students
      .filter(matchesStudentFilters)
      .map((st) => {
        const stAtt = attendance.filter((a) => a.student_id === st.id);
        const stExc = excuses.filter((e) => e.student_id === st.id);
        return {
          id: st.id,
          studentName: st.full_name,
          course: st.course || '—',
          yearSection: `${st.year_level || '—'} ${st.section || ''}`.trim(),
          present: stAtt.filter((a) => a.status === 'Present').length,
          late: stAtt.filter((a) => a.status === 'Late').length,
          absent: stAtt.filter((a) => a.status === 'Absent').length,
          excused: stAtt.filter((a) => a.status === 'Excused').length,
          excusesCount: stExc.length,
        };
      });
  }

  // Default: attendance summary
  return attendance
    .filter((a) => (!eventId || eventId === 'All' || String(a.event_id) === String(eventId)))
    .filter((a) => matchesStudentFilters(studentMap[a.student_id]))
    .filter((a) => matchesDateRange(eventMap[String(a.event_id)]?.event_date))
    .map((a) => {
      const st = studentMap[a.student_id];
      const ev = eventMap[String(a.event_id)];
      return {
        id: a.attendance_id,
        studentId: a.student_id,
        studentName: st?.full_name || 'Unknown',
        courseSection: `${st?.course || '—'} ${st?.year_level || ''}`.trim(),
        eventName: ev?.name || 'Event',
        date: ev?.event_date || '—',
        status: a.status,
        recordedTime: a.recorded_time || '—',
      };
    });
}

export async function recordReportExport(reportType, rowCount, actor) {
  await logActivity({
    actor,
    action: 'Generated Report',
    module: 'Reports',
    description: `Exported ${reportType} report (${rowCount} row(s)) to PDF.`,
  });
}