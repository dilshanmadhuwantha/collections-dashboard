import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

  // ✅ Format date as YYYY-MM-DD
  function formatDate(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    if (isNaN(d)) return null;
    return d.toISOString().split("T")[0];
  }

  // ✅ Group data by day → then agent-wise
  const dailyData = {};

  rows.forEach((row) => {
    const date = formatDate(row.created_at); // ✅ IMPORTANT FIX
    if (!date) return;

    if (!dailyData[date]) {
      dailyData[date] = {
        "Call Count": {},
        "Money Collection": {
          PreDue: {},
          Soft: {},
          Medium: {},
          Hard: {},
          RES: {},
        },
        "PTP Count": {},
        "Login Time": {},
      };
    }

    const agent = row.Employee;
    const value = Number(row.Value || 0);

    // ✅ Call Count (no subcategory used)
    if (row.Criterion === "Call Count") {
      dailyData[date]["Call Count"][agent] =
        (dailyData[date]["Call Count"][agent] || 0) + value;
    }

    // ✅ Money Collection — 5 buckets
    if (row.Criterion === "Money Collection") {
      const bucket = row.Subcategory || "General";
      if (dailyData[date]["Money Collection"][bucket]) {
        dailyData[date]["Money Collection"][bucket][agent] =
          (dailyData[date]["Money Collection"][bucket][agent] || 0) + value;
      }
    }

    // ✅ PTP Count — General only
    if (row.Criterion === "PTP Count") {
      dailyData[date]["PTP Count"][agent] =
        (dailyData[date]["PTP Count"][agent] || 0) + value;
    }

    // ✅ Login Time — General only
    if (row.Criterion === "Login Time") {
      dailyData[date]["Login Time"][agent] =
        (dailyData[date]["Login Time"][agent] || 0) + value;
    }
  });

  // ✅ Helper: convert object → chart array
  function toChartData(obj) {
    return Object.entries(obj).map(([agent, value]) => ({
      agent,
      value,
    }));
  }

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Manager Dashboard</h1>
      <h2>Total Rows: {rows.length}</h2>

      {/* ✅ Daily Charts */}
      <h2 style={{ marginTop: 30 }}>Daily Performance</h2>

      {Object.entries(dailyData).map(([date, data]) => (
        <div key={date} style={{ marginTop: 50, paddingBottom: 40 }}>
          <h2>📅 {date}</h2>

          {/* ✅ CALL COUNT (Agent wise) */}
          <h3>Call Count (All Agents)</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={toChartData(data["Call Count"])}>
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#007bff" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ✅ MONEY COLLECTION — 5 bucket charts */}
          <h3>Money Collection — PreDue</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={toChartData(data["Money Collection"].PreDue)}>
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#FF5733" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3>Money Collection — Soft</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={toChartData(data["Money Collection"].Soft)}>
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#33A1FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3>Money Collection — Medium</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={toChartData(data["Money Collection"].Medium)}>
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#2ECC71" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3>Money Collection — Hard</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={toChartData(data["Money Collection"].Hard)}>
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#C70039" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3>Money Collection — RES</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={toChartData(data["Money Collection"].RES)}>
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#9B59B6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ✅ PTP COUNT */}
          <h3>PTP Count (General)</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={toChartData(data["PTP Count"])}>
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#FF8C00" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ✅ LOGIN TIME */}
          <h3>Login Time (General)</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={toChartData(data["Login Time"])}>
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#17A589" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
