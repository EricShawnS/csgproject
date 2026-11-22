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

export async function uploadEventBanner(file) {
  if (!file) return null;

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('event-banners')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('event-banners').getPublicUrl(filePath);
  return data?.publicUrl || null;
}

async function removeBannerIfStored(bannerUrl) {
  if (!bannerUrl || !bannerUrl.includes('/event-banners/')) return;
  const marker = '/event-banners/';
  const idx = bannerUrl.indexOf(marker);
  if (idx === -1) return;
  const objectPath = decodeURIComponent(bannerUrl.slice(idx + marker.length).split('?')[0]);
  if (!objectPath) return;

  await supabase.storage.from('event-banners').remove([objectPath]);
}

export async function createEvent(eventInput, actor) {
  let bannerUrl = eventInput.banner_url || null;
  if (eventInput.bannerFile) {
    bannerUrl = await uploadEventBanner(eventInput.bannerFile);
  }

  const payload = {
    name: eventInput.name.trim(),
    description: eventInput.description?.trim() || null,
    instructions: eventInput.instructions?.trim() || null,
    event_date: eventInput.event_date || null,
    event_time: eventInput.event_time || null,
    venue: eventInput.venue?.trim() || null,
    status: eventInput.status || 'Upcoming',
    source: eventInput.source || 'admin',
    banner_url: bannerUrl,
    icon_key: eventInput.icon_key && eventInput.icon_key !== 'auto' ? eventInput.icon_key : null,
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
  let bannerUrl = eventInput.banner_url || null;
  if (eventInput.bannerFile) {
    bannerUrl = await uploadEventBanner(eventInput.bannerFile);
  }

  const payload = {
    name: eventInput.name.trim(),
    description: eventInput.description?.trim() || null,
    instructions: eventInput.instructions?.trim() || null,
    event_date: eventInput.event_date || null,
    event_time: eventInput.event_time || null,
    venue: eventInput.venue?.trim() || null,
    status: eventInput.status || 'Upcoming',
    banner_url: bannerUrl,
    icon_key: eventInput.icon_key && eventInput.icon_key !== 'auto' ? eventInput.icon_key : null,
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

export async function deleteEvent(eventOrId, actor) {
  const id = typeof eventOrId === 'object' ? eventOrId.id : eventOrId;
  const bannerUrl = typeof eventOrId === 'object' ? eventOrId.banner_url : null;
  const eventName = typeof eventOrId === 'object' ? eventOrId.name : `ID ${id}`;

  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;

  await removeBannerIfStored(bannerUrl);

  await logActivity({
    actor,
    action: 'Deleted Event',
    module: 'Event Management',
    description: `Deleted event "${eventName}"`,
  });
}

export async function deleteEvents(targetEvents, actor) {
  const list = Array.isArray(targetEvents) ? targetEvents : [];
  if (list.length === 0) return;

  const ids = list.map((ev) => (typeof ev === 'object' ? ev.id : ev));
  const { error } = await supabase.from('events').delete().in('id', ids);
  if (error) throw error;

  for (const ev of list) {
    if (typeof ev === 'object' && ev.banner_url) {
      await removeBannerIfStored(ev.banner_url);
    }
  }

  const namesPreview = list
    .map((ev) => (typeof ev === 'object' ? ev.name : `ID ${ev}`))
    .slice(0, 4)
    .join(', ');

  await logActivity({
    actor,
    action: 'Deleted Events',
    module: 'Event Management',
    description: `Deleted ${ids.length} event(s): ${namesPreview}${ids.length > 4 ? '...' : ''}`,
  });
}