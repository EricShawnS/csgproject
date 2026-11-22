import { useCallback, useEffect, useState } from 'react';
import { fetchEvents } from '../services/eventsService';
import { fetchExcuseRequests } from '../services/excuseRequestsService';
import { fetchAnnouncements } from '../services/announcementsService';
import { fetchStudents } from '../services/studentsService';
import { fetchActivityLogs } from '../services/ActivityLogService';
import { fetchNotifications } from '../services/notificationsService';

export function useAdminData() {
  const [events, setEvents] = useState([]);
  const [excuses, setExcuses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ev, ex, an, st, lg, nt] = await Promise.all([
        fetchEvents(),
        fetchExcuseRequests(),
        fetchAnnouncements(),
        fetchStudents(),
        fetchActivityLogs(),
        fetchNotifications(),
      ]);
      setEvents(ev);
      setExcuses(ex);
      setAnnouncements(an);
      setStudents(st);
      setLogs(lg);
      setNotifications(nt);
    } catch (err) {
      setError(err.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pendingExcusesCount = excuses.filter((r) => r.status === 'Pending').length;

  return {
    events,
    excuses,
    announcements,
    students,
    logs,
    notifications,
    pendingExcusesCount,
    loading,
    error,
    refresh,
  };
}