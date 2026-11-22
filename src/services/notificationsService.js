import { supabase } from '../lib/supabase';

export async function fetchNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, recipient_role, user_id, type, title, message, target_path, is_read, is_archived, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id, isRead = true) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: isRead })
    .eq('id', id);

  if (error) throw error;
}

export async function archiveNotification(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_archived: true })
    .eq('id', id);

  if (error) throw error;
}