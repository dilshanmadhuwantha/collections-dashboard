// /pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1) Sign in with Supabase
    const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signErr) {
      setLoading(false);
      setError(signErr.message || "Login failed");
      return;
    }

    const user = signData?.user;
    if (!user) {
      setLoading(false);
      setError("No user returned from auth");
      return;
    }

    // 2) Confirm session exists (useful for RLS)
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user?.id) {
      setLoading(false);
      setError("No active session after sign-in");
      return;
    }

    // 3) Fetch the profile row by id (RLS expects id = auth.uid())
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, role, emp_id, display_name, email")
      .eq("id", user.id)
      .maybeSingle(); // don't throw on 0 rows

    setLoading(false);

    if (!profile) {
      setError(profErr?.message || "Profile not found (no row visible under RLS)");
      return;
    }

    // 4) Route by role
    const role = (profile.role || "").toLowerCase();
    if (role === "agent") {
      router.push("/agent/dashboard");
    } else if (role === "manager" || role === "admin") {
      router.push("/manager/dashboard");
    } else {
      setError(`Unknown role: ${profile.role ?? "null"}`);
    }
  }

  return (
    <div style={{
      maxWidth: 540,
      margin: "60px auto",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      lineHeight: 1.5
    }}>
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail((e.target.value || "").toLowerCase())}
          placeholder="Email"
          autoComplete="username"
          required
          style={{ width: "100%", padding: 12, marginBottom: 10 }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          required
          style={{ width: "100%", padding: 12, marginBottom: 10 }}
        />

        {error ? (
          <div style={{ color: "red", marginBottom: 10 }}>{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            cursor: "pointer",
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: 6
          }}
        >
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>

      <div style={{ marginTop: 14, fontSize: 12, color: "#666" }}>
        Tip: make sure your <code>profiles</code> row exists with the same <code>id</code> as <code>auth.users</code>.
      </div>
    </div>
  );
}
