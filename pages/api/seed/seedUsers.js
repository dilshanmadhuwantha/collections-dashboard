import { createClient } from '@supabase/supabase-js';

// IMPORTANT: use service role key (NOT anon key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Secret check
  const expectedSecret = process.env.SECRET_SEED_TOKEN;
  const urlSecret = req.query.secret;

  if (urlSecret !== expectedSecret) {
    return res.status(401).json({
      ok: false,
      debug: {
        urlSecret,
        envSecret: expectedSecret
      }
    });
  }

  // ✅ User list
  const users = [
    { email: "nimesh@test.com", role: "manager", emp_id: 33, full_name: "Nimesh Perera" },
    { email: "iresha@test.com", role: "agent", emp_id: 39, full_name: "Iresha Dilhani" },
    { email: "asanka@test.com", role: "agent", emp_id: 40, full_name: "Asanka Nash" },
    { email: "dilshan@test.com", role: "manager", emp_id: 59, full_name: "Dilshan Maduwantha" },
    // ✅ Add all other employees here
  ];

  let created = [];
  let errors = [];

  for (let u of users) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          email: u.email,
          role: u.role,
          emp_id: u.emp_id,
          display_name: u.full_name
        },
        { onConflict: "email" }
      );

    if (error) errors.push({ user: u.email, error });
    else created.push(u.email);
  }

  return res.status(200).json({
    ok: true,
    created,
    errors
  });
}
