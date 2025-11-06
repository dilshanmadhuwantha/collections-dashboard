import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) setRows(json.data);
    }
    load();
  }, []);

  // Convert date (YYYY-MM-DD)
  const formatDate = (val) => val?.split("T")[0];

  // GROUP rows by: date → criterion → agent
  const dailyData = {};

  rows.forEach((row) => {
    const date = formatDate(row.date);
    if (!date) return;

    if (!dailyData[date]) dailyData[date] = {
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

    const agent = row.Employee;
    const value = Number(row.Value || 0);

    // ✅ CALL COUNT (ignore subcategory)
    if (row.Criterion === "Call Count") {
      dailyData[date]["Call Count"][agent] =
        (dailyData[date]["Call Count"][agent] || 0) + value;
    }

    // ✅ MONEY COLLECTION (use subcategories)
    if (row.Criterion === "Money Collection") {
      const sub = row.Subcategory || "Soft";
      dailyData[date]["Money Collection"][sub][agent] =
        (dailyData[date]["Money Collection"][sub][agent] || 0) + value;
    }

    // ✅ PTP COUNT (General only)
    if (row.Criterion === "PTP Count") {
      dailyData[date]["PTP Count"][agent] =
        (dailyData[date]["PTP Count"][agent] || 0) + value;
    }

    // ✅ LOGIN TIME (General)
    if (row.Criterion === "Login Time") {
      dailyData[date]["Login Time"][agent] =
        (dailyData[date]["Login Time"][agent] || 0) + value;
    }
  });

  // Convert grouped to chart array
  const toChart = (obj) =>
    Object.entries(obj).map(([agent, value]) => ({ agent, value }));

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Manager Dashboard</h1>
      <h2>Total Rows: {rows.length}</h2>

      {/* ✅ DAILY BLOCKS */}
      {Object.keys(dailyData).map((date) => (
        <div key={date} style={{ marginTop: 40 }}>
          <h2>📅 {date}</h2>

          {/* ✅ CALL COUNT (all agents) */}
          <h3>Call Count — All Agents</h3>
          <ChartBlock data={toChart(dailyData[date]["Call Count"])} />

          {/* ✅ MONEY COLLECTION BY SUBCATEGORY */}
          <h3 style={{ marginTop: 20 }}>Money Collection</h3>

          {["PreDue", "Soft", "Medium", "Hard", "RES"].map((sub) => (
            <div key={sub} style={{ marginBottom: 25 }}>
              <h4>{sub}</h4>
              <ChartBlock data={toChart(dailyData[date]["Money Collection"][sub])} />
            </div>
          ))}

          {/* ✅ PTP COUNT */}
          <h3>PTP Count — All Agents</h3>
          <ChartBlock data={toChart(dailyData[date]["PTP Count"])} />

          {/* ✅ LOGIN TIME */}
          <h3>Login Time — All Agents</h3>
          <ChartBlock data={toChart(dailyData[date]["Login Time"])} />
        </div>
      ))}
    </div>
  );
}

/* ✅ Reusable chart component */
function ChartBlock({ data }) {
  if (!data || data.length === 0)
    return <p style={{ color: "gray" }}>No data</p>;

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="agent" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#0088FE" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
