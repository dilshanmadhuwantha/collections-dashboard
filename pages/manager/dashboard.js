// ✅ Manager Dashboard – Clean Updated Version with Bucket Filter + Date Fix

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function ManagerDashboard() {
  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);

  // ✅ Filters
  const [mode, setMode] = useState("single");
  const [singleDate, setSingleDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [agent, setAgent] = useState("All");
  const [selectedCriterion, setSelectedCriterion] = useState("All");
  const [bucket, setBucket] = useState("All");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) {
        setAllRows(json.data);

        // ✅ Set latest date automatically
        if (json.data.length > 0) {
          const latest = json.data
            .map((d) => d.date)
            .sort()
            .reverse()[0];
          setSingleDate(latest);
        }
      }
    }
    load();
  }, []);

  // ✅ Filtering Logic
  useEffect(() => {
    let filtered = [...allRows];

    // ✅ Date filter
    if (mode === "single" && singleDate) {
      filtered = filtered.filter((r) => r.date === singleDate);
    }

    if (mode === "range" && rangeStart && rangeEnd) {
      filtered = filtered.filter(
        (r) => r.date >= rangeStart && r.date <= rangeEnd
      );
    }

    // ✅ Agent filter
    if (agent !== "All") {
      filtered = filtered.filter((r) => r.Employee === agent);
    }

    // ✅ Criterion filter
    if (selectedCriterion !== "All") {
      filtered = filtered.filter((r) => r.Criterion === selectedCriterion);
    }

    // ✅ Bucket filter (Money Collection only)
    if (selectedCriterion === "Money Collection") {
      if (bucket !== "All") {
        filtered = filtered.filter((r) => r.Subcategory === bucket);
      }
    }

    setRows(filtered);
  }, [allRows, mode, singleDate, rangeStart, rangeEnd, agent, selectedCriterion, bucket]);

  // ✅ Summary values
  const totalCall = rows
    .filter((r) => r.Criterion === "Call Count")
    .reduce((a, b) => a + Number(b.Value), 0);

  const totalMoney = rows
    .filter((r) => r.Criterion === "Money Collection")
    .reduce((a, b) => a + Number(b.Value), 0);

  const totalPTP = rows
    .filter((r) => r.Criterion === "PTP Count")
    .reduce((a, b) => a + Number(b.Value), 0);

  const totalLogin = rows
    .filter((r) => r.Criterion === "Login Time")
    .reduce((a, b) => a + Number(b.Value), 0);

  // ✅ Build trend chart data
  const trendData = rows.map((r) => ({
    date: r.date,
    value: Number(r.Value),
  }));

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <h2 style={styles.title}>Collections Dashboard</h2>

        {/* ✅ Filter Mode */}
        <div style={styles.section}>
          <label style={styles.label}>FILTER MODE</label>
          <div>
            <label>
              <input
                type="radio"
                checked={mode === "single"}
                onChange={() => setMode("single")}
              />{" "}
              Single Day
            </label>
            <br />
            <label>
              <input
                type="radio"
                checked={mode === "range"}
                onChange={() => setMode("range")}
              />{" "}
              Date Range
            </label>
          </div>
        </div>

        {/* ✅ Date Selection */}
        {mode === "single" && (
          <div style={styles.section}>
            <label style={styles.label}>Select Date</label>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>
        )}

        {mode === "range" && (
          <div style={styles.section}>
            <label style={styles.label}>Start Date</label>
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              style={styles.dateInput}
            />

            <label style={styles.label}>End Date</label>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              style={styles.dateInput}
            />
          </div>
        )}

        {/* ✅ Agent Filter */}
        <div style={styles.section}>
          <label style={styles.label}>Agent</label>
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            style={styles.select}
          >
            <option value="All">All</option>
            {[...new Set(allRows.map((r) => r.Employee))].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ Criterion Filter */}
        <div style={styles.section}>
          <label style={styles.label}>Criterion</label>
          <select
            value={selectedCriterion}
            onChange={(e) => {
              setSelectedCriterion(e.target.value);
              setBucket("All"); // Reset bucket automatically
            }}
            style={styles.select}
          >
            <option value="All">All</option>
            <option value="Call Count">Call Count</option>
            <option value="Money Collection">Money Collection</option>
            <option value="PTP Count">PTP Count</option>
            <option value="Login Time">Login Time</option>
          </select>
        </div>

        {/* ✅ Bucket Filter for Money Collection */}
        {selectedCriterion === "Money Collection" && (
          <div style={styles.section}>
            <label style={styles.label}>Bucket</label>
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              style={styles.select}
            >
              <option value="All">All</option>
              <option value="PreDue">PreDue</option>
              <option value="Soft">Soft</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="RES">RES</option>
            </select>
          </div>
        )}
      </div>

      {/* ✅ Main Content */}
      <div style={styles.main}>
        <h1>Manager Dashboard</h1>
        <p>
          Total rows after filters: <b>{rows.length}</b>
        </p>

        {/* ✅ KPIs */}
        <div style={styles.kpiRow}>
          {kpi("Call Count", totalCall)}
          {kpi("Money Collection", totalMoney)}
          {kpi("PTP Count", totalPTP)}
          {kpi("Login Time", totalLogin)}
        </div>

        {/* ✅ Trend Chart */}
        <div style={styles.chartBox}>
          <h3>Trend — {selectedCriterion}</h3>

          {trendData.length === 0 ? (
            <p>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <Line type="monotone" dataKey="value" stroke="#ff7300" />
                <CartesianGrid stroke="#ccc" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

/* ✅ Reusable KPI Box */
const kpi = (label, value) => (
  <div style={styles.kpi}>
    <div style={styles.kpiLabel}>{label}</div>
    <div style={styles.kpiValue}>{value}</div>
  </div>
);

/* ✅ Styles */
const styles = {
  page: { display: "flex", height: "100vh", background: "#f8fafc" },

  sidebar: {
    width: 260,
    padding: 20,
    background: "#0f172a",
    color: "white",
    overflowY: "auto",
  },

  title: { fontSize: 18, marginBottom: 20 },

  section: { marginBottom: 20 },

  label: { display: "block", marginBottom: 6 },

  select: {
    width: "100%",
    padding: "8px 10px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "white",
  },

  dateInput: {
    width: "100%",
    padding: "8px 10px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "white",
    WebkitAppearance: "menulist",
    MozAppearance: "menulist",
  },

  main: { flex: 1, padding: 30, overflowY: "auto" },

  kpiRow: { display: "flex", gap: 20, marginBottom: 30 },

  kpi: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    width: 220,
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },

  kpiLabel: { fontSize: 14, color: "#475569" },
  kpiValue: { fontSize: 24, fontWeight: "bold", marginTop: 8 },

  chartBox: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
};
