import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // Filters
  const [mode, setMode] = useState("single");
  const [singleDate, setSingleDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [agent, setAgent] = useState("All");
  const [criterion, setCriterion] = useState("All");
  const [subcategory, setSubcategory] = useState("All");

  // Load data from API
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();

      if (json.success) {
        const data = json.data.map((r) => ({
          ...r,
          safeDate: (r.date || r.created_at || "").slice(0, 10),
        }));

        setRows(data);

        // Auto-select newest date
        const newest = data.length
          ? data
              .map((r) => r.safeDate)
              .filter((d) => d)
              .sort()
              .reverse()[0]
          : "";

        setSingleDate(newest);
      }
    }

    load();
  }, []);

  // Filter logic
  useEffect(() => {
    let f = [...rows];

    // Filter by date mode
    if (mode === "single" && singleDate) {
      f = f.filter((r) => r.safeDate === singleDate);
    }

    if (mode === "range" && rangeStart && rangeEnd) {
      f = f.filter(
        (r) => r.safeDate >= rangeStart && r.safeDate <= rangeEnd
      );
    }

    // Filter by agent
    if (agent !== "All") f = f.filter((r) => r.Employee === agent);

    // Filter by criterion
    if (criterion !== "All") f = f.filter((r) => r.Criterion === criterion);

    // Filter by subcategory
    if (subcategory !== "All")
      f = f.filter((r) => r.Subcategory === subcategory);

    setFiltered(f);
  }, [rows, mode, singleDate, rangeStart, rangeEnd, agent, criterion, subcategory]);

  // Group and summarize metrics
  const sum = (crit) =>
    filtered
      .filter((r) => r.Criterion === crit)
      .reduce((t, r) => t + Number(r.Value || 0), 0);

  const Kpis = {
    Calls: sum("Call Count"),
    Money: sum("Money Collection"),
    PTP: sum("PTP Count"),
    Login: sum("Login Time"),
  };

  // Trend data (money collection per date)
  const trend = [];
  const dateGroups = {};

  filtered.forEach((r) => {
    if (!dateGroups[r.safeDate]) dateGroups[r.safeDate] = 0;
    if (r.Criterion === "Money Collection") {
      dateGroups[r.safeDate] += Number(r.Value || 0);
    }
  });

  for (const d in dateGroups) {
    trend.push({ date: d, value: dateGroups[d] });
  }

  trend.sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <div style={{ padding: 20 }}>
      <h1>Manager Dashboard</h1>

      <p>
        Total rows after filters: <strong>{filtered.length}</strong>
      </p>

      {/* KPI CARDS */}
      <div style={{ display: "flex", gap: 20 }}>
        <Kpi label="Call Count" value={Kpis.Calls} />
        <Kpi label="Money Collection" value={Kpis.Money} />
        <Kpi label="PTP Count" value={Kpis.PTP} />
        <Kpi label="Login Time" value={Kpis.Login} />
      </div>

      {/* TREND CHART */}
      <h3 style={{ marginTop: 40 }}>Trend — Money Collection</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#ff6600" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 10,
        background: "#fff",
        width: 200,
        boxShadow: "0px 2px 5px rgba(0,0,0,0.1)",
      }}
    >
      <h4>{label}</h4>
      <h2>{value}</h2>
    </div>
  );
}
