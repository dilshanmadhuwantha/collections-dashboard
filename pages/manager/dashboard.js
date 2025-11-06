import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) {
        setRows(json.data);
      }
    }
    load();
  }, []);

  // Group by Criterion
  const criterionTotals = rows.reduce((acc, row) => {
    acc[row.Criterion] = (acc[row.Criterion] || 0) + Number(row.Value || 0);
    return acc;
  }, {});

  const criterionData = Object.entries(criterionTotals).map(([key, value]) => ({
    name: key,
    value
  }));

  // Colors for pie
  const COLORS = ["#0088FE", "#FF8042", "#00C49F", "#FFBB28", "#AA00FF"];

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Manager Dashboard</h1>

      <h2>Total Rows: {rows.length}</h2>

      {/* ✅ BAR CHART */}
      <div style={{ width: "100%", height: 350, marginTop: 40 }}>
        <h3>Performance by Criterion (Bar Chart)</h3>
        <ResponsiveContainer>
          <BarChart data={criterionData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ PIE CHART */}
      <div style={{ width: "100%", height: 350, marginTop: 40 }}>
        <h3>Performance Distribution (Pie Chart)</h3>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={criterionData}
              dataKey="value"
              nameKey="name"
              outerRadius={130}
            >
              {criterionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ OLD TABLE STILL SHOWN BELOW IF YOU WANT */}
      <h3 style={{ marginTop: 40 }}>Raw Data</h3>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
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
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.Employee}</td>
              <td>{row["Employee ID"]}</td>
              <td>{row.Criterion}</td>
              <td>{row.Subcategory}</td>
              <td>{row.Value}</td>
              <td>{row.uploaded_by || "-"}</td>
              <td>{row.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
