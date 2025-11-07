// pages/api/seed/seedUsers.js
import { createClient } from "@supabase/supabase-js";

/**
 * Requires env vars:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (server-side)
 * - SECRET_SEED_TOKEN (server-side)
 */

const users = [
  // managers
  { emp_id: "33",  name: "Nimesh Perera",            email: "nimesh.perera@test.com",            role: "manager" },
  { emp_id: "59",  name: "Dilshan Maduwantha",       email: "dilshan.maduwantha@test.com",       role: "manager" },

  // agents
  { emp_id: "39",  name: "Iresha Dilhani",           email: "iresha.dilhani@test.com",           role: "agent" },
  { emp_id: "40",  name: "Asanka Nash",              email: "asanka.nash@test.com",              role: "agent" },
  { emp_id: "66",  name: "Pasindu Premalal",         email: "pasindu.premalal@test.com",         role: "agent" },
  { emp_id: "80",  name: "Pavithra Thangaraja",      email: "pavithra.thangaraja@test.com",      role: "agent" },
  { emp_id: "96",  name: "Preeni Sanoja",            email: "preeni.sanoja@test.com",            role: "agent" },
  { emp_id: "102", name: "Varuni Lakshani",          email: "varuni.lakshani@test.com",          role: "agent" },
  { emp_id: "110", name: "Jadeeshan Suresh",         email: "jadeeshan.suresh@test.com",         role: "agent" },
  { emp_id: "135", name: "Nipuni Weerakoon",         email: "nipuni.weerakoon@test.com",         role: "agent" },
  { emp_id: "136", name: "Chathura Kosla",           email: "chathura.kosla@test.com",           role: "agent" },
  { emp_id: "150", name: "Sandeepa Lakruwan",        email: "sandeepa.lakruwan@test.com",        role: "agent" },
  { emp_id: "186", name: "Eshan Shashika",           email: "eshan.shashika@test.com",           role: "agent" },
  { emp_id: "206", name: "Venura Lakshitha",         email: "venura.lakshitha@test.com",         role: "agent" },
  { emp_id: "208", name: "Thanusha Deshani",         email: "thanusha.deshani@test.com",         role: "agent" },
  { emp_id: "228", name: "Thanoj Vishman",           email: "thanoj.vishman@test.com",           role: "agent" },
  { emp_id: "253", name: "Lehan Hansaja",            email: "lehan.hansaja@test.com",            role: "agent" },
  { emp_id: "259", name: "Hasini Pituwala",          email: "hasini.pituwala@test.com",          role: "agent" },
  { emp_id: "279", name: "Malinda Chathuranga",      email: "malinda.chathuranga@test.com",      role: "agent" },
  { emp_id: "281", name: "Vihanga Makumbura",        email: "vihanga.makumbura@test.com",        role: "agent" },
  { emp_id: "316", name: "Dulan Charuka",            email: "dulan.charuka@test.com",            role: "agent" },
  { emp_id: "338", name: "Kalindu Sachith",          email: "kalindu.sachith@test.com",          role: "agent" },
  { emp_id: "342", name: "Heshan Kalhara",           email: "heshan.kalhara@test.com",           role: "agent" },
  { emp_id: "362", name: "Prarthana Dewmini",        email: "prarthana.dewmini@test.com",        role: "agent" },
  { emp_id: "369", name: "Kavindu Kalhara",          email: "kavindu.kalhara@test.com",          role: "agent" },
  { emp_id: "375", name: "Ruchini Nawanjana",        email: "ruchini.nawanjana@test.com",        role: "agent" },
  { emp_id: "380", name: "Sanduni Kaushalya",        email: "sanduni.kaushalya@test.com",        role: "agent" },
  { emp_id: "396", name: "Thilina Hashan",           email: "thilina.hashan@test.com",           role: "agent" },
  { emp_id: "398", name: "Chanthuka Maleesha",       email: "chanthuka.maleesha@test.com",       role: "agent" },
  { emp_id: "406", name: "Dinusha Shanaka",          email: "dinusha.shanaka@test.com",          role: "agent" },
  { emp_id: "413", name: "Naduni Kaveesha",          email: "naduni.kaveesha@test.com",          role: "agent" },
  { emp_id: "420", name: "Sandali Nisansala",        email: "sandali.nisansala@test.com",        role: "agent" },
  { emp_id: "424", name: "Chathuni Vimarsha",        email: "chathuni.vimarsha@test.com",        role: "agent" },
  { emp_id: "431", name: "Sasantha Udesh",           email: "sasantha.udesh@test.com",           role: "agent" },
  { emp_id: "432", name: "Raveesha Nethmini",        email: "raveesha.nethmini@test.com",        role: "agent" },
  { emp_id: "448", name: "Lakshan Perera",           email: "lakshan.perera@test.com",           role: "agent" },
  { emp_id: "451", name: "Gihan Pamodh",             email: "gihan.pamodh@test.com",             role: "agent" },
  { emp_id: "452", name: "Imalsha Perera",           email: "imalsha.perera@test.com",           role: "agent" },
  { emp_id: "455", name: "Harith Shenun",            email: "harith.shenun@test.com",            role: "agent" },
  { emp_id: "456", name: "Nipun Sudharaka",          email: "nipun.sudharaka@test.com",          role: "agent" },
  { emp_id: "458", name: "Avishka Shalinda",         email: "avishka.shalinda@test.com",         role: "agent" },
  { emp_id: "467", name: "Niroshan Buddika",         email: "niroshan.buddika@test.com",         role: "agent" },
  { emp_id: "473", name: "Chathurangi Baddevithana", email: "chathurangi.baddevithana@test.com", role: "agent" },
  { emp_id: "477", name: "Sanduni Rupika",           email: "sanduni.rupika@test.com",           role: "agent" },
  { emp_id: "480", name: "Amandi Upeksha",           email: "amandi.upeksha@test.com",           role: "agent" },
  { emp_id: "483", name: "Chamilka Oshada",          email: "chamilka.oshada@test.com",          role: "agent" },
  { emp_id: "487", name: "Maleesha Kalhara",         email: "maleesha.kalhara@test.com",         role: "agent" },
  { emp_id: "490", name: "Methdinu Jayasinghe",      email: "methdinu.jayasinghe@test.com",      role: "agent" },
  { emp_id: "492", name: "Ishara Madhuwanthi",       email: "ishara.madhuwanthi@test.com",       role: "agent" },
  { emp_id: "498", name: "Anthony Trevin",           email: "anthony.trevin@test.com",           role: "agent" },
  { emp_id: "501", name: "Dinura Thamuditha",        email: "dinura.thamuditha@test.com",        role: "agent" },
  { emp_id: "503", name: "Ranula Sheron",            email: "ranula.sheron@test.com",            role: "agent" },
  { emp_id: "504", name: "Ishani Saraswathy",        email: "ishani.saraswathy@test.com",        role: "agent" },
];

export default async function handler(req, res) {
  try {
    // Protect route with a secret
    const token = req.query.secret || req.headers["x-seed-token"];
    if (!token || token !== process.env.SECRET_SEED_TOKEN) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    if (req.method !== "POST" && req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Use POST or GET" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // service role (server-only)
    );

    const results = [];

    for (const u of users) {
      const password = u.role === "manager" ? "Manager@123" : "Agent@123";

      // 1) Create Auth user
      const { data: created, error: createErr } =
        await supabase.auth.admin.createUser({
          email: u.email,
          password,
          email_confirm: true,
          user_metadata: { emp_id: u.emp_id, name: u.name, role: u.role },
          app_metadata:  { role: u.role },
        });

      let userId = created?.user?.id || null;

      if (createErr) {
        // If already exists, look up their id
        if (!String(createErr.message).toLowerCase().includes("already registered")) {
          results.push({ email: u.email, status: "auth_error", error: createErr.message });
          continue;
        }
        const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) {
          results.push({ email: u.email, status: "list_error", error: listErr.message });
          continue;
        }
        const match = list?.users?.find(x => x.email?.toLowerCase() === u.email.toLowerCase());
        userId = match?.id || null;
      }

      if (!userId) {
        results.push({ email: u.email, status: "no_user_id" });
        continue;
      }

      // 2) Upsert into profiles
      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: u.email,
            role: u.role,
            emp_id: u.emp_id,
            display_name: u.name,
          },
          { onConflict: "id" }
        );

      if (upsertErr) {
        results.push({ email: u.email, status: "profile_error", error: upsertErr.message });
        continue;
      }

      results.push({ email: u.email, status: "ok", password });
    }

    return res.status(200).json({ ok: true, results });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
