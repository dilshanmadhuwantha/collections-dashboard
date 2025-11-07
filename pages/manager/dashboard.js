import { requireAuth } from "../../utils/requireAuth";

export async function getServerSideProps(ctx) {
  return requireAuth(ctx, ["manager"]);
}// pages/manager/dashboard.js
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";

const METRICS = ["Money Collection", "Call Count", "PTP Count", "Login Time"];
const BUCKETS = ["Pre due", "Soft", "Medium", "Hard", "RES"];

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Top filters
  const [dateFrom, setDateFrom] = useState(() => new Date());
  const [dateTo, setDateTo] = useState(() => new Date());
  const [metric, setMetric] = useState("Money Collection");
  const [bucket, setBucket] = useState(""); // only for Money Collection

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (dateFrom) q.set("dateFrom", dateFrom.toISOString().slice(0, 10));
      if (dateTo) q.set("dateTo", dateTo.toISOString().slice(0, 10));
      const res = await fetch(`/api/getAllStats?${q.toString()}`);
      const json = await res.json();
      if (json.success) setRows(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  // KPIs (totals)
  const kpis = useMemo(() => {
    const t = { call: 0, money: 0, ptp: 0, login: 0 };
    rows.forEach((r) => {
      const v = Number(r.Value || 0);
      if (r.Criterion === "Call Count") t.call += v;
      else if (r.Criterion === "Money Collection") t.money += v;
      else if (r.Criterion === "PTP Count") t.ptp += v;
      else if (r.Criterion === "Login Time") t.login += v;
    });
    return t;
  }, [rows]);

  // Agent-wise chart (based on current metric + optional bucket)
  const byAgent = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (r.Criterion !== metric) return;
      if (metric === "Money Collection" && bucket && (r.Subcategory || "").toLowerCase() !== bucket.toLowerCase())
        return;
      const key = r.Employee || r["Employee ID"];
      map[key] = (map[key] || 0) + Number(r.Value || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows, metric, bucket]);

  // Trend by day (for current metric)
  const trend = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (r.Criterion !== metric) return;
      if (metric === "Money Collection" && bucket && (r.Subcategory || "").toLowerCase() !== bucket.toLowerCase())
        return;
      const d = (r.created_at || "").slice(0, 10);
      map[d] = (map[d] || 0) + Number(r.Value || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }, [rows, metric, bucket]);

  return (
    <div style={{ padding: 30, fontFamily: "Arial", maxWidth: 1200, margin: "0 auto" }}>
      <h1>Manager Dashboard</h1>

      {/* Top filter bar */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <span style={{ marginRight: 6 }}>From:</span>
          <DatePicker selected={dateFrom} onChange={setDateFrom} dateFormat="yyyy-MM-dd" />
        </div>
        <div>
          <span style={{ marginRight: 6 }}>To:</span>
          <DatePicker selected={dateTo} onChange={setDateTo} dateFormat="yyyy-MM-dd" />
        </div>

        <select value={metric} onChange={(e) => setMetric(e.target.value)} style={{ padding: 6 }}>
          {METRICS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {metric === "Money Collection" && (
          <select value={bucket} onChange={(e) => setBucket(e.target.value)} style={{ padding: 6 }}>
            <option value="">All Buckets</option>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}

        <button onClick={load} disabled={loading} style={{ padding: "6px 12px" }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <Kpi label="Call Count" value={kpis.call} />
        <Kpi label="Money Collection (LKR)" value={kpis.money} />
        <Kpi label="PTP Count" value={kpis.ptp} />
        <Kpi label="Login Time (mins)" value={kpis.login} />
      </div>

      {/* Agent-wise bar chart */}
      <section style={{ height: 360, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>
          {metric} {metric === "Money Collection" && bucket ? `— ${bucket}` : ""} (By Agent)
        </h3>
        <ResponsiveContainer>
          <BarChart data={byAgent}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name={metric} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Trend line */}
      <section style={{ height: 360 }}>
        <h3 style={{ marginBottom: 8 }}>{metric} — Trend</h3>
        <ResponsiveContainer>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line dataKey="value" name={metric} dot />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fafafa" }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}
