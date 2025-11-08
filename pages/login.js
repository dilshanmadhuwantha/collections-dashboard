// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
// IMPORTANT: use the file you actually have in the repo:
import { supabase } from "../lib/supabase"; // <-- not ../utils/supabaseClient

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

    try {
      console.log("[login] email:", email);

      // 1) Auth
      const { data, error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log("[login] signIn result:", { data, signErr });

      if (signErr) throw signErr;
      const user = data?.user;
      if (!user) throw new Error("No user returned from signIn");

      // 2) Fetch profile (RLS: id must equal auth.uid())
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id, role, emp_id, display_name, email")
        .eq("id", user.id)
        .single();

      console.log("[login] profile result:", { profile, profErr });

      if (profErr || !profile) throw new Error("Profile not found");

      // 3) Route by role
      if (profile.role === "agent") {
        router.push("/agent/dashboard");
      } else if (profile.role === "manager" || profile.role === "admin") {
        router.push("/manager/dashboard");
      } else {
        throw new Error("Unknown role");
      }
    } catch (err) {
      console.error("[login] error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
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
