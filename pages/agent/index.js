import { requireAuth } from "../../utils/requireAuth";

// ✅ Only agents allowed
export async function getServerSideProps(ctx) {
  return requireAuth(ctx, ["agent"]);
}

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AgentDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      // ✅ Get logged-in user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUser(session.user);

      // ✅ Agent ID = user email OR full_name from profile
      const empId = session.user.email;

      // ✅ Load stats from Airtable by Employee email
      const res = await fetch(`/api/getAgentStats?empId=${empId}`);
      const json = await res.json();
      if (json.success) setRows(json.data);
    })();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Agent Dashboard</h1>

      {user && (
        <p>
          Logged in as: <strong>{user.email}</strong>
        </p>
      )}

      {rows.length === 0 && <p>Loading stats...</p>}

      {rows.length > 0 && (
        <table border="1" cellPadding="8" style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Criterion</th>
              <th>Subcategory</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.Criterion}</td>
                <td>{r.Subcategory}</td>
                <td>{r.Value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
