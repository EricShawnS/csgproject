import { supabase } from '../lib/supabase';
import { logActivity } from './ActivityLogService';

export async function fetchExcuseRequests() {
  const { data, error } = await supabase
    .from('excuse_requests')
    .select(`
      id,
      student_id,
      event_id,
      reason,
      explanation,
      document_name,
      status,
      remarks,
      decided_by,
      decided_on,
      created_at,
      students ( id, full_name, course, year_level, section ),
      events ( id, name, event_date )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function decideExcuseRequest(request, decision, remarks, actor) {
  const decidedOn = new Date().toISOString().split('T')[0];
  const deciderName = actor?.name || 'Administrator';

  const { data, error } = await supabase
    .from('excuse_requests')
    .update({
      status: decision,
      remarks: remarks?.trim() || null,
      decided_by: deciderName,
      decided_on: decidedOn,
    })
    .eq('id', request.id)
    .select(`
      id,
      student_id,
      event_id,
      reason,
      explanation,
      document_name,
      status,
      remarks,
      decided_by,
      decided_on,
      created_at,
      students ( id, full_name, course, year_level, section ),
      events ( id, name, event_date )
    `)
    .single();

  if (error) throw error;

  // Approved excuse marks attendance as Excused; Rejected leaves attendance Absent if recorded
  if (request.student_id && request.event_id) {
    if (decision === 'Approved') {
      await supabase.from('attendance').upsert(
        {
          event_id: request.event_id,
          student_id: request.student_id,
          status: 'Excused',
          recorded_time: new Date().toTimeString().slice(0, 5),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,student_id' }
      );
    } else if (decision === 'Rejected') {
      await supabase
        .from('attendance')
        .update({
          status: 'Absent',
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', request.event_id)
        .eq('student_id', request.student_id)
        .eq('status', 'Excused');
    }
  }

  await logActivity({
    actor,
    action: `${decision} Excuse`,
    module: 'Excuse Requests',
    description: `${decision} excuse request #${request.id} for student ${request.student_id}${remarks ? ` — "${remarks.trim()}"` : ''}`,
  });

  await supabase.from('notifications').insert({
    recipient_role: 'officer',
    type: 'excuse',
    title: `Excuse ${decision}: ${request.students?.full_name || request.student_id}`,
    message: `Decision recorded by ${deciderName}${remarks?.trim() ? `: ${remarks.trim()}` : '.'}`,
    target_path: '/officer/attendance',
  });

  return data;
}