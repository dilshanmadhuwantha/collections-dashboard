import { requireAuth } from "../../utils/requireAuth";

// ✅ Protect this page — only AGENTS can access
export async function getServerSideProps(ctx) {
  return requireAuth(ctx, ["agent"]);
}

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AgentDashboard() {
  const [rows, setRows] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // ✅ Get session data
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const userEmail = session.user.email;
      setUser(session.user);

      // ✅ Load stats using email
      try {
        const res = await fetch(`/api/getAgentStats?email=${userEmail}`);
        const json = await res.json();

        if (json.success) {
          setRows(json.data);
        }
      } catch (err) {
        console.error("Failed to load agent stats:", err);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ padding: 40 }}>Loading agent dashboard...</p>;

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Agent Dashboard</h1>

      {user && (
        <p>
          Logged in as: <strong>{user.email}</strong>
        </p>
      )}

      {rows.length === 0 && (
        <p style={{ marginTop: 20 }}>
          No data found for your account.
          <br />
          Please check if your email exists in Airtable.
        </p>
      )}

      {rows.length > 0 && (
        <table
          border="1"
          cellPadding="8"
          style={{ marginTop: 20, borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th>Criterion</th>
              <th>Subcategory</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.Criterion}</td>
                <td>{row.Subcategory || "-"}</td>
                <td>{row.Value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
