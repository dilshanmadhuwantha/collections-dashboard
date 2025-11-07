// pages/agent/dashboard.js
import { requireAuth } from "../../utils/requireAuth";
import { useEffect, useState } from "react";

export async function getServerSideProps(ctx) {
  return requireAuth(ctx, ["agent"]);
}

export default function AgentDashboard({ profile }) {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/getAgentStats?empId=${profile.emp_id}`);
      const json = await res.json();
      if (json.success) setStats(json.data);
    }
    load();
  }, [profile.emp_id]);

  const grouped = stats.reduce((acc, r) => {
    const key = `${r.Criterion} - ${r.Subcategory || "General"}`;
    acc[key] = acc[key] ? acc[key] + Number(r.Value || 0) : Number(r.Value || 0);
    return acc;
  }, {});

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Agent Dashboard</h1>
      <p>Welcome, {profile.display_name}</p>
      <p>Employee ID: {profile.emp_id}</p>

      {stats.length === 0 ? (
        <p>Loading...</p>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Criterion</th>
              <th>Subcategory</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([key, val]) => {
              const [criterion, sub] = key.split(" - ");
              return (
                <tr key={key}>
                  <td>{criterion}</td>
                  <td>{sub}</td>
                  <td>{val}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
