import { useState } from "react";
import { useRouter } from "next/router";

export default function AgentLogin() {
  const [empId, setEmpId] = useState("");
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!empId) return alert("Please enter your Employee ID");
    router.push(`/agent/dashboard?empId=${empId}`);
  };

  return (
    <div style={{ padding: "60px", fontFamily: "sans-serif" }}>
      <h1>Agent Login</h1>
      <form onSubmit={handleLogin}>
        <label>
          Employee ID:
          <input
            type="number"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            style={{ marginLeft: "10px", padding: "6px" }}
          />
        </label>
        <button
          type="submit"
          style={{
            marginLeft: "15px",
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}
