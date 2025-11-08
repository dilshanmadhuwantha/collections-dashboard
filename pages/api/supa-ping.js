// pages/api/supa-ping.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing SUPABASE envs on server" });
    }

    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

    // Small sanity check – select 1 from profiles (no data leak)
    const { error } = await admin.from("profiles").select("id", { count: "exact", head: true });
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[supa-ping] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
