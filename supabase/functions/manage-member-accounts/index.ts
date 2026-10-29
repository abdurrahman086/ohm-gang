import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!url || !anonKey || !serviceRoleKey) return json({ error: 'Server is not configured' }, 500);
  if (!authorization) return json({ error: 'Authentication required' }, 401);

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return json({ error: 'Authentication required' }, 401);
  const { data: callerProfile, error: roleError } = await caller.from('profiles').select('role').eq('id', user.id).single();
  if (roleError || callerProfile?.role !== 'wali_kelas') return json({ error: 'Only wali kelas can manage accounts' }, 403);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid request body' }, 400);
  const input = body as { action?: unknown; userId?: unknown; email?: unknown };
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  if (input.action === 'list') {
    const authUsers = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: 'Unable to load user accounts' }, 500);
      authUsers.push(...data.users);
      if (data.users.length < 1000) break;
    }
    const { data: profiles, error } = await admin.from('profiles').select('id,full_name,role').order('full_name');
    if (error) return json({ error: 'Unable to load user profiles' }, 500);
    const emailById = new Map(authUsers.map((account) => [account.id, account.email ?? '']));
    return json({ users: (profiles ?? []).map((profile) => ({ ...profile, email: emailById.get(profile.id) ?? '' })) });
  }

  if (input.action === 'update_email') {
    const userId = typeof input.userId === 'string' ? input.userId : '';
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (!userId || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Provide a valid user ID and email address' }, 400);
    }
    const { data: target, error: targetError } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (targetError || !target || !['member', 'keuangan'].includes(target.role)) {
      return json({ error: 'Only member and bendahara accounts can be updated' }, 403);
    }
    const { error } = await admin.auth.admin.updateUserById(userId, { email });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: 'Unsupported action' }, 400);
});
