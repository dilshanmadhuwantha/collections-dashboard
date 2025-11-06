import { useEffect, useState } from "react";

export default function ManagerDashboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/getAllStats");
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      } catch (err) {
        console.error("Error loading stats:", err);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Manager Dashboard</h1>

      {loading ? <p>Loading data...</p> : null}

      {!loading && (
        <>
          <p><strong>Total Rows:</strong> {stats.length}</p>

          <table border="1" cellPadding="8" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Criterion</th>
                <th>Subcategory</th>
                <th>Value</th>
                <th>Uploaded By</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((r, i) => (
                <tr key={i}>
                  <td>{r.Employee}</td>
                  <td>{r["Employee ID"]}</td>
                  <td>{r.Criterion}</td>
                  <td>{r.Subcategory}</td>
                  <td>{r.Value}</td>
                  <td>{r.uploaded_by || "-"}</td>
                  <td>{r.created_at || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
