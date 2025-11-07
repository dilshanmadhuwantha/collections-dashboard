import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);

  // Filters
  const [selectedDate, setSelectedDate] = useState("");
  const [mode, setMode] = useState("single"); // single | range

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedAgent, setSelectedAgent] = useState("All");
  const [selectedCriterion, setSelectedCriterion] = useState("All");

  // Load all data
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

  // ✅ AUTO-SELECT LATEST AVAILABLE DATE (STEP 2)
  useEffect(() => {
    if (rows.length > 0 && !selectedDate) {
      const latest = rows
        .map(r => new Date(r.created_at))
        .sort((a, b) => b - a)[0];

      const formatted = latest.toISOString().split("T")[0];
      setSelectedDate(formatted);
    }
  }, [rows]);

  // Filter logic
  const filtered = rows.filter(r => {
    // date filter
    let matchDate = true;

    if (mode === "single" && selectedDate) {
      matchDate = r.created_at.startsWith(selectedDate);
    }

    if (mode === "range" && startDate && endDate) {
      const d = new Date(r.created_at);
      matchDate = d >= new Date(startDate) && d <= new Date(endDate);
    }

    // agent filter
    let matchAgent = selectedAgent === "All" || r.Employee === selectedAgent;

    // criterion filter
    let matchCriterion =
      selectedCriterion === "All" || r.Criterion === selectedCriterion;

    return matchDate && matchAgent && matchCriterion;
  });

  // KPIs (filtered)
  const callCount = filtered
    .filter(r => r.Criterion === "Call Count")
    .reduce((a, b) => a + Number(b.Value || 0), 0);

  const moneyCollection = filtered
    .filter(r => r.Criterion === "Money Collection")
    .reduce((a, b) => a + Number(b.Value || 0), 0);

  const ptpCount = filtered
    .filter(r => r.Criterion === "PTP Count")
    .reduce((a, b) => a + Number(b.Value || 0), 0);

  const loginTime = filtered
    .filter(r => r.Criterion === "Login Time")
    .reduce((a, b) => a + Number(b.Value || 0), 0);

  // Trend data example (Money Collection Hard)
  const trendHard = filtered
    .filter(r => r.Criterion === "Money Collection" && r.Subcategory === "Hard")
    .map(r => ({
      date: r.created_at.split("T")[0],
      value: Number(r.Value)
    }));

  return (
    <div style={{ display: "flex" }}>

      {/* ---------- SIDEBAR ---------- */}
      <div style={{ width: 260, padding: 20, borderRight: "1px solid #ccc" }}>
        <h2>Filters</h2>

        <label>
          <input
            type="radio"
            checked={mode === "single"}
            onChange={() => setMode("single")}
          /> Single Day
        </label>

        <label style={{ marginLeft: 20 }}>
          <input
            type="radio"
            checked={mode === "range"}
            onChange={() => setMode("range")}
          /> Date Range
        </label>

        {/* Single Day */}
        {mode === "single" && (
          <div style={{ marginTop: 10 }}>
            <label>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: "100%", marginTop: 5 }}
            />
          </div>
        )}

        {/* Date Range */}
        {mode === "range" && (
          <div style={{ marginTop: 10 }}>
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
            />

            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        )}

        {/* Agent Filter */}
        <div style={{ marginTop: 20 }}>
          <label>Agent</label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            style={{ width: "100%", marginTop: 5 }}
          >
            <option>All</option>
            {[...new Set(rows.map(r => r.Employee))].map(a => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Criterion Filter */}
        <div style={{ marginTop: 20 }}>
          <label>Criterion</label>
          <select
            value={selectedCriterion}
            onChange={(e) => setSelectedCriterion(e.target.value)}
            style={{ width: "100%", marginTop: 5 }}
          >
            <option>All</option>
            {[...new Set(rows.map(r => r.Criterion))].map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

      </div>

      {/* ---------- MAIN CONTENT ---------- */}
      <div style={{ flex: 1, padding: 30 }}>
        <h1>Manager Dashboard</h1>
        <p>Total rows after filters: {filtered.length}</p>

        {/* KPI CARDS */}
        <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
          <div className="card">📞 Call Count<br />{callCount}</div>
          <div className="card">💰 Money Collection<br />{moneyCollection}</div>
          <div className="card">🤝 PTP Count<br />{ptpCount}</div>
          <div className="card">⏱ Login Time<br />{loginTime}</div>
        </div>

        {/* TREND CHART */}
        <h2 style={{ marginTop: 40 }}>Trend – Money Collection (Hard)</h2>

        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={trendHard}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#ff6600" />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
