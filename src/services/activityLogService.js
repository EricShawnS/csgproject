import { supabase } from '../lib/supabase';

export async function fetchActivityLogs() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, actor_id, actor_name, actor_role, action, module, description, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function logActivity({ actor, action, module, description }) {
  const payload = {
    actor_id: actor?.id ?? null,
    actor_name: actor?.name || 'System',
    actor_role: actor?.role || 'admin',
    action,
    module,
    description,
  };

  const { error } = await supabase.from('activity_logs').insert(payload);
  if (error) {
    // Non-blocking fallback so primary mutations still succeed if log policy is strict
    console.error('Failed to write activity log:', error.message);
  }
}