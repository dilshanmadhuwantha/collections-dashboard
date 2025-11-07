// pages/login.js
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // 1) Supabase Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    const user = data.user;

    // 2) Fetch user profile & role
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      setErrorMsg("Profile not found!");
      return;
    }

    // ✅ Role-based redirect
    if (profile.role === "manager" || profile.role === "admin") {
      router.push("/manager/dashboard");
    } else if (profile.role === "agent") {
      router.push(`/agent/dashboard?empId=${profile.emp_id}`);
    } else {
      setErrorMsg("Unknown role. Contact admin.");
    }
  };

  return (
    <div style={{ padding: "60px", maxWidth: 400, margin: "0 auto" }}>
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        {errorMsg && (
          <div style={{ color: "red", marginBottom: 10 }}>{errorMsg}</div>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 12,
            background: "black",
            color: "white",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}
