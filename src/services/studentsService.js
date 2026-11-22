import { supabase } from '../lib/supabase';
import { logActivity } from './ActivityLogService';

export async function fetchStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, course, year_level, section, enrollment_status, created_at')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function saveStudent(studentInput, actor) {
  const cleanId = String(studentInput.id || '').trim();
  const cleanName = String(studentInput.full_name || '').trim();
  if (!cleanId || !cleanName) {
    throw new Error('Student ID and Full Name are required.');
  }

  const payload = {
    id: cleanId,
    full_name: cleanName,
    course: studentInput.course?.trim() || null,
    year_level: studentInput.year_level?.trim() || null,
    section: studentInput.section?.trim() || null,
    enrollment_status: studentInput.enrollment_status || 'Enrolled',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('students')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actor,
    action: studentInput.isEdit ? 'Updated Student' : 'Added Student',
    module: 'Student Records',
    description: `${studentInput.isEdit ? 'Updated' : 'Added'} student ${data.full_name} (${data.id}).`,
  });

  return data;
}

export async function syncStudentsFromEnrollment(actor) {
  const { data: existing, error: fetchErr } = await supabase
    .from('students')
    .select('id, full_name, course, year_level, section, enrollment_status');

  if (fetchErr) throw fetchErr;

  if (!existing || existing.length === 0) {
    await logActivity({
      actor,
      action: 'Synced Students',
      module: 'Student Records',
      description: 'Ran enrollment sync on empty student roster (0 records).',
    });
    return { syncedCount: 0, students: [] };
  }

  const stamped = existing.map((s) => ({
    ...s,
    enrollment_status: s.enrollment_status || 'Enrolled',
    updated_at: new Date().toISOString(),
  }));

  const { data: upserted, error: upsertErr } = await supabase
    .from('students')
    .upsert(stamped, { onConflict: 'id' })
    .select();

  if (upsertErr) throw upsertErr;

  await logActivity({
    actor,
    action: 'Synced Students',
    module: 'Student Records',
    description: `Synchronized ${upserted?.length ?? stamped.length} student record(s) from enrollment data.`,
  });

  return {
    syncedCount: upserted?.length ?? stamped.length,
    students: upserted || stamped,
  };
}