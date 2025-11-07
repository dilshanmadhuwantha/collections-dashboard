// pages/api/seed/seedUsers.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 0) Protect the endpoint
  const expectedSecret = process.env.SECRET_SEED_TOKEN;
  const urlSecret = req.query.secret;
  if (urlSecret !== expectedSecret) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized',
      debug: { urlSecret, envSecret: expectedSecret }
    });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({
      ok: false,
      error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    });
  }

  // Admin client (only used for DB upsert into profiles)
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Helper: call REST Admin API
  async function adminFetch(path, options = {}) {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        ...(options.headers || {})
      }
    });
    const text = await resp.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    return { status: resp.status, ok: resp.ok, data: json };
  }

  // Get or create an auth user by email (REST)
  async function getOrCreateAuthUser({ email, password, metadata }) {
    // 1) Try to fetch by email
    const getRes = await adminFetch(`/admin/users?email=${encodeURIComponent(email)}`, { method: 'GET' });
    if (getRes.ok && Array.isArray(getRes.data) && getRes.data.length > 0) {
      return { user: getRes.data[0], created: false };
    }

    // 2) Create user if not found
    const createRes = await adminFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata || {}
      })
    });

    if (createRes.ok) {
      return { user: createRes.data, created: true };
    }

    // Handle "already exists" race condition
    if (createRes.status === 422 || createRes.status === 409) {
      const retry = await adminFetch(`/admin/users?email=${encodeURIComponent(email)}`, { method: 'GET' });
      if (retry.ok && Array.isArray(retry.data) && retry.data.length > 0) {
        return { user: retry.data[0], created: false };
      }
    }

    throw new Error(`Admin createUser failed: ${JSON.stringify(createRes)}`);
  }

  // Your seed list (add the rest as needed)
  const people = [
    { emp_id: 33,  name: 'Nimesh Perera',       role: 'manager', email: 'nimesh@test.com' },
    { emp_id: 39,  name: 'Iresha Dilhani',      role: 'agent',   email: 'iresha@test.com' },
    { emp_id: 40,  name: 'Asanka Nash',         role: 'agent',   email: 'asanka@test.com' },
    { emp_id: 59,  name: 'Dilshan Maduwantha',  role: 'manager', email: 'dilshan@test.com' },
    // ... add the others here ...
  ];

  const created = [];
  const errors = [];

  for (const p of people) {
    try {
      const { user, created: userCreated } = await getOrCreateAuthUser({
        email: p.email,
        password: 'Agent@123',
        metadata: { full_name: p.name, emp_id: p.emp_id, role: p.role }
      });

      // Upsert into profiles — IMPORTANT: onConflict must match UNIQUE(email)
      const { error: upErr } = await supa
        .from('profiles')
        .upsert(
          {
            id: user.id,                // keep profiles.id == auth.users.id
            email: p.email,             // UNIQUE(email)
            display_name: p.name,
            role: p.role,
            emp_id: p.emp_id
          },
          { onConflict: 'email' }
        );

      if (upErr) {
        errors.push({ user: p.email, step: 'profiles.upsert', error: upErr });
      } else {
        created.push({ email: p.email, authCreated: userCreated });
      }
    } catch (e) {
      errors.push({ user: p.email, step: 'exception', error: String(e) });
    }
  }

  return res.json({ ok: true, created, errors });
}
