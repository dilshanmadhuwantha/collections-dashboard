// pages/api/seed/seedUsers.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1) Protect the endpoint with your Vercel env secret
  const expectedSecret = process.env.SECRET_SEED_TOKEN;
  const urlSecret = req.query.secret;
  if (urlSecret !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', debug: { urlSecret, envSecret: expectedSecret } });
  }

  // 2) Admin client (Service Role) – required to create auth users
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 3) Your people list (example)
  const people = [
    { emp_id: 33,  name: 'Nimesh Perera',       role: 'manager', email: 'nimesh@test.com' },
    { emp_id: 39,  name: 'Iresha Dilhani',      role: 'agent',   email: 'iresha@test.com' },
    { emp_id: 40,  name: 'Asanka Nash',         role: 'agent',   email: 'asanka@test.com' },
    { emp_id: 59,  name: 'Dilshan Maduwantha',  role: 'manager', email: 'dilshan@test.com' },
    // ... (add the rest here as needed)
  ];

  const created = [];
  const errors = [];

  for (const p of people) {
    try {
      // 3a) Check if auth user already exists
      let userId = null;
      const check = await supa.auth.admin.getUserByEmail(p.email);
      if (check.data?.user) {
        userId = check.data.user.id;
      } else {
        // 3b) Create auth user if not exists
        const { data: createRes, error: createErr } = await supa.auth.admin.createUser({
          email: p.email,
          password: 'Agent@123',
          email_confirm: true,
          user_metadata: { full_name: p.name, emp_id: p.emp_id, role: p.role }
        });
        if (createErr) {
          errors.push({ user: p.email, step: 'createUser', error: createErr });
          continue;
        }
        userId = createRes.user.id;
      }

      // 3c) UPSERT into profiles – NOTE: onConflict must match UNIQUE(email)
      const { error: upErr } = await supa
        .from('profiles')
        .upsert(
          {
            id: userId,                 // keep auth.id in sync
            email: p.email,             // UNIQUE(email)
            display_name: p.name,
            role: p.role,
            emp_id: p.emp_id
          },
          { onConflict: 'email' }       // <— MUST be exactly 'email'
        );

      if (upErr) {
        errors.push({ user: p.email, step: 'profiles.upsert', error: upErr });
      } else {
        created.push(p.email);
      }
    } catch (e) {
      errors.push({ user: p.email, step: 'exception', error: String(e) });
    }
  }

  return res.json({ ok: true, created, errors });
}
