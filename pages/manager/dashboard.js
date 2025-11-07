import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from "recharts";

export default function ManagerDashboard() {
  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);

  // Filters
  const [mode, setMode] = useState("single");   // single | range
  const [singleDate, setSingleDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [selectedAgent, setSelectedAgent] = useState("All");
  const [selectedCriterion, setSelectedCriterion] = useState("All");

  // Trend metric
  const [trendMetric, setTrendMetric] = useState("Money Collection");
  const [trendBucket, setTrendBucket] = useState("Hard");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) {
        setAllRows(json.data);

        // auto-select latest date
        const newest = json.data
          .map(r => r.date.slice(0, 10))
          .sort()
          .reverse()[0];

        setSingleDate(newest);
      }
    }
    load();
  }, []);

  // ✅ Date + Filters
  useEffect(() => {
    if (allRows.length === 0) return;

    let filtered = [...allRows];

    // ✅ DATE FILTER FIX — trims timestamp
    if (mode === "single" && singleDate) {
      filtered = filtered.filter(
        (r) => r.date.slice(0, 10) === singleDate
      );
    }

    // ✅ DATE RANGE FIX
    if (mode === "range" && rangeStart && rangeEnd) {
      filtered = filtered.filter((r) => {
        const d = r.date.slice(0, 10);
        return d >= rangeStart && d <= rangeEnd;
      });
    }

    // Agent
    if (selectedAgent !== "All") {
      filtered = filtered.filter((r) => r.Employee === selectedAgent);
    }

    // Criterion
    if (selectedCriterion !== "All") {
      filtered = filtered.filter((r) => r.Criterion === selectedCriterion);
    }

    setRows(filtered);
  }, [allRows, mode, singleDate, rangeStart, rangeEnd, selectedAgent, selectedCriterion]);

  // ========= SUMMARY TOTALS ===========
  const sum = (crit) =>
    rows
      .filter((r) => r.Criterion === crit)
      .reduce((a, b) => a + Number(b.Value || 0), 0);

  const totalCall = sum("Call Count");
  const totalMoney = sum("Money Collection");
  const totalPTP = sum("PTP Count");
  const totalLogin = sum("Login Time");

  // ========= TREND CHART DATA ===========
  const trendData = rows
    .filter((r) => r.Criterion === trendMetric)
    .filter((r) => r.Subcategory === trendBucket)
    .map((r) => ({
      date: r.date.slice(0, 10),
      value: Number(r.Value),
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  // Get all agents for dropdown
  const agentList = [...new Set(allRows.map((r) => r.Employee))];

  // Buckets for money collection
  const bucketOptions = ["PreDue", "Soft", "Medium", "Hard", "RES"];

  return (
    <div style={{ display: "flex" }}>
      {/* -------- SIDEBAR -------- */}
      <div style={{
        width: 260, padding: 20, background: "#0d1b2a",
        color: "white", height: "100vh"
      }}>
        <h3>Collections Dashboard</h3>

        {/* MODE TOGGLE */}
        <p>FILTER MODE</p>
        <label>
          <input
            type="radio"
            checked={mode === "single"}
            onChange={() => setMode("single")}
          />
          &nbsp;Single Day
        </label>
        <br />
        <label>
          <input
            type="radio"
            checked={mode === "range"}
            onChange={() => setMode("range")}
          />
          &nbsp;Date Range
        </label>

        {/* DATE PICKERS */}
        <div style={{ marginTop: 20 }}>
          {mode === "single" && (
            <>
              <p>Select Date</p>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                style={{ width: "100%" }}
              />
            </>
          )}

          {mode === "range" && (
            <>
              <p>Start Date</p>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                style={{ width: "100%" }}
              />
              <p>End Date</p>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                style={{ width: "100%" }}
              />
            </>
          )}
        </div>

        {/* AGENT FILTER */}
        <p style={{ marginTop: 20 }}>Agent</p>
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          style={{ width: "100%" }}
        >
          <option>All</option>
          {agentList.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>

        {/* CRITERION FILTER */}
        <p style={{ marginTop: 20 }}>Criterion</p>
        <select
          value={selectedCriterion}
          onChange={(e) => setSelectedCriterion(e.target.value)}
          style={{ width: "100%" }}
        >
          <option>All</option>
          <option>Call Count</option>
          <option>Money Collection</option>
          <option>PTP Count</option>
          <option>Login Time</option>
        </select>

        {/* TREND METRIC */}
        <p style={{ marginTop: 20 }}>Trend Metric</p>
        <select
          value={trendMetric}
          onChange={(e) => setTrendMetric(e.target.value)}
          style={{ width: "100%" }}
        >
          <option>Money Collection</option>
          <option>Call Count</option>
          <option>PTP Count</option>
          <option>Login Time</option>
        </select>

        {/* TREND BUCKET (Only shows for Money Collection) */}
        {trendMetric === "Money Collection" && (
          <>
            <p style={{ marginTop: 20 }}>Bucket</p>
            <select
              value={trendBucket}
              onChange={(e) => setTrendBucket(e.target.value)}
              style={{ width: "100%" }}
            >
              {bucketOptions.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* -------------- MAIN CONTENT -------------- */}
      <div style={{ flex: 1, padding: 30 }}>
        <h1>Manager Dashboard</h1>
        <p>
          Total rows after filters: <b>{rows.length}</b> | Mode:{" "}
          <b>{mode}</b>
        </p>

        {/* Summary Cards */}
        <div style={{ display: "flex", gap: 20 }}>
          <Card title="Call Count" value={totalCall} />
          <Card title="Money Collection" value={totalMoney.toLocaleString()} />
          <Card title="PTP Count" value={totalPTP} />
          <Card title="Login Time" value={totalLogin} />
        </div>

        {/* TREND LINE CHART */}
        <h3 style={{ marginTop: 40 }}>
          Trend — {trendMetric}
          {trendMetric === "Money Collection" ? ` (${trendBucket})` : ""}
        </h3>

        <div style={{ height: 350 }}>
          <ResponsiveContainer>
            <LineChart data={trendData}>
              <CartesianGrid stroke="#ccc" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="value" stroke="#ff7300" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        background: "white",
        padding: 20,
        borderRadius: 10,
        minWidth: 220,
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      }}
    >
      <h4>{title}</h4>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
