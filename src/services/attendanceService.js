import { supabase } from '../lib/supabase';
import { logActivity } from './ActivityLogService';

export async function fetchAttendanceByEvent(eventId) {
  let query = supabase
    .from('attendance')
    .select('attendance_id, status, recorded_time, event_id, student_id, updated_at')
    .order('attendance_id', { ascending: true });

  if (eventId && eventId !== 'All') {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchAllAttendance() {
  const { data, error } = await supabase
    .from('attendance')
    .select('attendance_id, status, recorded_time, event_id, student_id, updated_at');

  if (error) throw error;
  return data || [];
}

export async function upsertAttendanceStatus({ eventId, studentId, status }, actor) {
  const recordedTime = new Date().toTimeString().slice(0, 5);
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        event_id: eventId,
        student_id: studentId,
        status,
        recorded_time: recordedTime,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,student_id' }
    )
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actor,
    action: 'Recorded Attendance',
    module: 'Attendance',
    description: `Marked student ${studentId} as ${status} for event #${eventId}.`,
  });

  return data;
}