import { supabase } from '../lib/supabase';
import { logActivity } from './ActivityLogService';

export async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    // Fallback if is_pinned column is not in the table
    const fallback = await supabase
      .from('announcements')
      .select('*')
      .order('id', { ascending: false });
    if (fallback.error) throw fallback.error;
    return fallback.data || [];
  }

  return data || [];
}

async function upsertAnnouncementRow(tablePayload, id) {
  if (id) {
    return await supabase
      .from('announcements')
      .update(tablePayload)
      .eq('id', id)
      .select()
      .single();
  }
  return await supabase
    .from('announcements')
    .insert(tablePayload)
    .select()
    .single();
}

export async function saveAnnouncement(annInput, actor) {
  const imageUrl = annInput.image_url ?? annInput.banner_url ?? null;
  const senderName =
    annInput.sender || actor?.name || actor?.email || 'Admin';

  const basePayload = {
    title: annInput.title?.trim(),
    body: annInput.body ?? annInput.content ?? null,
    status: annInput.status || 'Published',
    ann_date: annInput.ann_date || new Date().toISOString().split('T')[0],
    sender: senderName,
    is_pinned: Boolean(annInput.is_pinned),
    is_archived: (annInput.status || 'Published') === 'Archived' || Boolean(annInput.is_archived),
    category: annInput.category || 'General',
    target_audience: annInput.target_audience || 'All Students',
  };

  // Try saving with image_url first, then banner_url, then without image columns if neither exists
  const candidates = [
    { ...basePayload, image_url: imageUrl, banner_url: imageUrl },
    { ...basePayload, image_url: imageUrl },
    { ...basePayload, banner_url: imageUrl },
    basePayload,
  ];

  let lastError = null;
  let savedRow = null;

  for (const payload of candidates) {
    const { data, error } = await upsertAnnouncementRow(payload, annInput.id);
    if (!error) {
      savedRow = data;
      lastError = null;
      break;
    }
    lastError = error;
  }

  if (lastError) throw lastError;

  await logActivity({
    actor,
    action: annInput.id ? 'Updated Announcement' : 'Created Announcement',
    module: 'Announcements',
    description: `${annInput.id ? 'Updated' : 'Saved'} announcement "${savedRow?.title || annInput.title}" (${savedRow?.status || basePayload.status})`,
  });

  return savedRow;
}