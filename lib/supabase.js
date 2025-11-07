// /lib/supabase.js
import { createClient } from '@supabase/supabase-js';

/**
 * Public browser client (uses anon key)
 * Make sure these two env vars are set in Vercel:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      // persist the session in browser so RLS works on subsequent requests
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
