import { useEffect, useState } from "react";

export default function AgentDashboard() {
  const [stats, setStats] = useState([]);
  const empId = 480; // change this to the real Employee ID you want to view

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/getAgentStats?empId=${empId}`);
        const json = await res.json();
        console.log("Fetched data:", json); // helps you debug
        if (json.success) setStats(json.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }
    fetchData();
  }, []);

  // Group by Criterion + Subcategory
  const grouped = stats.reduce((acc, r) => {
    const key = `${r.Criterion} - ${r.Subcategory || "General"}`;
    acc[key] = acc[key] ? acc[key] + Number(r.Value || 0) : Number(r.Value || 0);
    return acc;
  }, {});

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Agent Dashboard</h1>
      <p>Employee ID: {empId}</p>

      {stats.length === 0 ? (
        <p>Loading data...</p>
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
              const [criterion, subcategory] = key.split(" - ");
              return (
                <tr key={key}>
                  <td>{criterion}</td>
                  <td>{subcategory}</td>
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
