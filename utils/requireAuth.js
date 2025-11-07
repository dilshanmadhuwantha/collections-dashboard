// utils/requireAuth.js
import { supabase } from "./supabaseClient";

export async function requireAuth(ctx, allowedRoles = []) {
  const { req } = ctx;
  const access_token = req.cookies["sb-access-token"];

  if (!access_token) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  // Validate session
  const { data: { user } } = await supabase.auth.getUser(access_token).catch(() => ({
    data: { user: null }
  }));

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (allowedRoles.length > 0 && !allowedRoles.includes(profile.role))) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: { user, profile },
  };
}
