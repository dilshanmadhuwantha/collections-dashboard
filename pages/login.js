// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1) sign in
    const { data, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signErr) {
      setLoading(false);
      setError(signErr.message || "Login failed");
      return;
    }

    const user = data?.user;
    if (!user) {
      setLoading(false);
      setError("No user returned");
      return;
    }

    // 2) fetch profile BY ID (works with RLS policy id = auth.uid())
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, role, emp_id, display_name")
      .eq("id", user.id)
      .single();

    setLoading(false);

    if (profErr || !profile) {
      setError("Profile not found");
      return;
    }

    // 3) route by role
    if (profile.role === "agent") {
      router.push("/agent/dashboard");
    } else if (profile.role === "manager" || profile.role === "admin") {
      router.push("/manager/dashboard");
    } else {
      setError("Unknown role");
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase())}
          placeholder="Email"
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />
        {error ? (
          <div style={{ color: "red", marginBottom: 10 }}>{error}</div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 10, cursor: "pointer" }}
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
