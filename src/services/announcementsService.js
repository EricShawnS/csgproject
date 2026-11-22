import { supabase } from '../lib/supabase';
import { logActivity } from './ActivityLogService';

export async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveAnnouncement(input, actor) {
  const now = new Date();
  const status = input.status || 'Draft';
  const payload = {
    title: input.title.trim(),
    body: input.body?.trim() || '',
    sender: actor?.name || 'Administrator',
    status,
    ann_date: input.ann_date || now.toISOString().split('T')[0],
    ann_time: input.ann_time || now.toTimeString().slice(0, 5),
    is_pinned: Boolean(input.is_pinned),
    is_archived: status === 'Archived',
    is_read: false,
  };

  let result;
  if (input.id) {
    const { data, error } = await supabase
      .from('announcements')
      .update(payload)
      .eq('id', input.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('announcements')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    result = data;
  }

  if (status === 'Published') {
    await logActivity({
      actor,
      action: 'Published Announcement',
      module: 'Announcements',
      description: `Published announcement "${result.title}"`,
    });

    await supabase.from('notifications').insert({
      recipient_role: 'officer',
      type: 'announcement',
      title: `Announcement: ${result.title}`,
      message: result.body?.slice(0, 120) || 'New announcement published.',
      target_path: '/officer/announcements',
    });
  }

  return result;
}