import { supabase } from "../lib/supabase";

export async function requireAuth(ctx, allowedRoles = []) {
  const { req, res } = ctx;

  const accessToken = req.cookies["sb-access-token"];
  if (!accessToken) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  // ✅ Get current user
  const { data: { user } } = await supabase.auth.getUser(accessToken);

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  // ✅ Fetch profile for role checking
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  // ✅ Role protection
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  return { props: { user, profile } };
}
