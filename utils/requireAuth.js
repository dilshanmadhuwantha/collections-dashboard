import { supabase } from "../lib/supabase";

export async function requireAuth(ctx, allowedRoles = []) {
  const { req } = ctx;

  // ✅ Get access token from cookies
  const accessToken = req.cookies["sb-access-token"];
  if (!accessToken) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  // ✅ Get the user from token
  const { data: { user }, error: userErr } = await supabase.auth.getUser(accessToken);
  if (!user || userErr) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  // ✅ Get user profile (role)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  // ✅ Check allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  return { props: { user, profile } };
}
