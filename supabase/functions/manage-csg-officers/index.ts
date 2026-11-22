import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller has admin role in profiles
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfileError || callerProfile?.role !== 'admin') {
      return jsonResponse({ error: 'Admin access required' }, 403);
    }

    const body = await req.json();
    const { action } = body ?? {};

    if (action === 'create_officer') {
      const {
        email,
        password,
        full_name,
        position,
        department,
        require_password_change = true,
      } = body;

      if (!email || !password) {
        return jsonResponse({ error: 'Email and password are required' }, 400);
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const resolvedFullName = full_name
        ? String(full_name).trim()
        : normalizedEmail.split('@')[0];
      const resolvedPosition = position ? String(position).trim() : null;
      const resolvedDepartment = department ? String(department).trim() : null;

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'officer',
          full_name: resolvedFullName,
          position: resolvedPosition,
          department: resolvedDepartment,
        },
      });

      if (createError || !created.user) {
        throw createError || new Error('Failed to create user');
      }

      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: created.user.id,
            email: normalizedEmail,
            full_name: resolvedFullName,
            position: resolvedPosition,
            department: resolvedDepartment,
            role: 'officer',
            must_change_password: Boolean(require_password_change),
            password_updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (profileError) throw profileError;

      return jsonResponse({ user: created.user });
    }

    if (action === 'update_officer') {
      const {
        user_id,
        full_name,
        position,
        department,
        must_change_password,
      } = body;

      if (!user_id) {
        return jsonResponse({ error: 'user_id is required' }, 400);
      }

      const { data: existingProfile, error: existingErr } = await adminClient
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', user_id)
        .eq('role', 'officer')
        .single();

      if (existingErr || !existingProfile) {
        return jsonResponse({ error: 'Officer profile not found' }, 404);
      }

      const fallbackName =
        existingProfile.full_name ||
        existingProfile.email?.split('@')[0] ||
        'CSG Officer';
      const resolvedFullName =
        typeof full_name === 'string' && full_name.trim()
          ? full_name.trim()
          : fallbackName;
      const resolvedPosition =
        typeof position === 'string' && position.trim()
          ? position.trim()
          : null;
      const resolvedDepartment =
        typeof department === 'string' && department.trim()
          ? department.trim()
          : null;

      const updatePayload: Record<string, unknown> = {
        full_name: resolvedFullName,
        position: resolvedPosition,
        department: resolvedDepartment,
      };

      if (typeof must_change_password === 'boolean') {
        updatePayload.must_change_password = must_change_password;
      }

      const { data: updatedProfile, error: profileError } = await adminClient
        .from('profiles')
        .update(updatePayload)
        .eq('id', user_id)
        .eq('role', 'officer')
        .select('*')
        .single();

      if (profileError) throw profileError;

      await adminClient.auth.admin.updateUserById(user_id, {
        user_metadata: {
          role: 'officer',
          full_name: resolvedFullName,
          position: resolvedPosition,
          department: resolvedDepartment,
        },
      });

      return jsonResponse({ profile: updatedProfile });
    }

    if (action === 'change_password') {
      const { user_id, new_password, require_password_change = true } = body;

      if (!user_id || !new_password) {
        return jsonResponse({ error: 'user_id and new_password are required' }, 400);
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      });
      if (updateError) throw updateError;

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          must_change_password: Boolean(require_password_change),
          password_updated_at: new Date().toISOString(),
        })
        .eq('id', user_id)
        .eq('role', 'officer');

      if (profileError) throw profileError;

      return jsonResponse({ ok: true });
    }

    if (action === 'delete_officer') {
      const { user_id } = body;

      if (!user_id) {
        return jsonResponse({ error: 'user_id is required' }, 400);
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) throw deleteError;

      await adminClient.from('profiles').delete().eq('id', user_id).eq('role', 'officer');

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unexpected server error' },
      400
    );
  }
});