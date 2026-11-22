import { supabase } from '../lib/supabase';
import { logActivity } from './ActivityLogService';

export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })
    .order('id', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createEvent(eventInput, actor) {
  const payload = {
    name: eventInput.name.trim(),
    description: eventInput.description?.trim() || null,
    instructions: eventInput.instructions?.trim() || null,
    event_date: eventInput.event_date || null,
    event_time: eventInput.event_time || null,
    venue: eventInput.venue?.trim() || null,
    status: eventInput.status || 'Upcoming',
    source: eventInput.source || 'admin',
    attendance_required: Boolean(eventInput.attendance_required ?? true),
    late_tracking: Boolean(eventInput.late_tracking ?? true),
    penalty_tracking: Boolean(eventInput.penalty_tracking ?? true),
    accept_excuse: Boolean(eventInput.accept_excuse ?? true),
    show_on_calendar: Boolean(eventInput.show_on_calendar ?? true),
    late_fee: Number(eventInput.late_fee ?? 0),
    absent_fee: Number(eventInput.absent_fee ?? 0),
  };

  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actor,
    action: 'Created Event',
    module: 'Event Management',
    description: `Created event "${data.name}" (${data.status})`,
  });

  await supabase.from('notifications').insert({
    recipient_role: 'officer',
    type: 'event',
    title: `New Event: ${data.name}`,
    message: `Scheduled for ${data.event_date || 'TBD'} at ${data.venue || 'TBD'}.`,
    target_path: '/officer/events',
  });

  return data;
}

export async function updateEvent(id, eventInput, actor) {
  const payload = {
    name: eventInput.name.trim(),
    description: eventInput.description?.trim() || null,
    instructions: eventInput.instructions?.trim() || null,
    event_date: eventInput.event_date || null,
    event_time: eventInput.event_time || null,
    venue: eventInput.venue?.trim() || null,
    status: eventInput.status || 'Upcoming',
    attendance_required: Boolean(eventInput.attendance_required),
    late_tracking: Boolean(eventInput.late_tracking),
    penalty_tracking: Boolean(eventInput.penalty_tracking),
    accept_excuse: Boolean(eventInput.accept_excuse),
    show_on_calendar: Boolean(eventInput.show_on_calendar),
    late_fee: Number(eventInput.late_fee ?? 0),
    absent_fee: Number(eventInput.absent_fee ?? 0),
  };

  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    actor,
    action: 'Updated Event',
    module: 'Event Management',
    description: `Updated event "${data.name}" (${data.status})`,
  });

  return data;
}