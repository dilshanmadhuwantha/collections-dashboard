// pages/manager/dashboard.js
import { requireAuth } from "../../utils/requireAuth";
import { useEffect, useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";

export async function getServerSideProps(ctx) {
  return requireAuth(ctx, ["manager", "admin"]);
}

const METRICS = ["Money Collection", "Call Count", "PTP Count", "Login Time"];
const BUCKETS = ["Pre due", "Soft", "Medium", "Hard", "RES"];

export default function ManagerDashboard({ profile }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState(() => new Date());
  const [dateTo, setDateTo] = useState(() => new Date());
  const [metric, setMetric] = useState("Money Collection");
  const [bucket, setBucket] = useState("");

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("dateFrom", dateFrom.toISOString().slice(0, 10));
      q.set("dateTo", dateTo.toISOString().slice(0, 10));

      const res = await fetch(`/api/getAllStats?${q}`);
      const json = await res.json();
      if (json.success) setRows(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const t = { call: 0, money: 0, ptp: 0, login: 0 };
    rows.forEach((r) => {
      const v = Number(r.Value || 0);
      if (r.Criterion === "Call Count") t.call += v;
      if (r.Criterion === "Money Collection") t.money += v;
      if (r.Criterion === "PTP Count") t.ptp += v;
      if (r.Criterion === "Login Time") t.login += v;
    });
    return t;
  }, [rows]);

  const byAgent = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (r.Criterion !== metric) return;
      if (metric === "Money Collection" && bucket && (r.Subcategory || "").toLowerCase() !== bucket.toLowerCase())
        return;

      const key = r.Employee || r["Employee ID"];
      map[key] = (map[key] || 0) + Number(r.Value || 0);
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows, metric, bucket]);

  return (
    <div style={{ padding: 30, fontFamily: "Arial", maxWidth: 1200, margin: "0 auto" }}>
      <h1>Manager Dashboard</h1>
      <p>Welcome, {profile.display_name}</p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div>
          <span>From: </span>
          <DatePicker selected={dateFrom} onChange={setDateFrom} dateFormat="yyyy-MM-dd" />
        </div>

        <div>
          <span>To: </span>
          <DatePicker selected={dateTo} onChange={setDateTo} dateFormat="yyyy-MM-dd" />
        </div>

        <select value={metric} onChange={(e) => setMetric(e.target.value)}>
          {METRICS.map((m) => <option key={m}>{m}</option>)}
        </select>

        {metric === "Money Collection" && (
          <select value={bucket} onChange={(e) => setBucket(e.target.value)}>
            <option value="">All Buckets</option>
            {BUCKETS.map((b) => <option key={b}>{b}</option>)}
          </select>
        )}

        <button onClick={load}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <KPI label="Call Count" value={kpis.call} />
        <KPI label="Money Collection" value={kpis.money} />
        <KPI label="PTP Count" value={kpis.ptp} />
        <KPI label="Login Time" value={kpis.login} />
      </div>

      {/* Bar chart */}
      <div style={{ height: 350, marginTop: 30 }}>
        <h3>{metric} (By Agent)</h3>
        <ResponsiveContainer>
          <BarChart data={byAgent}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 15, borderRadius: 8 }}>
      <h4>{label}</h4>
      <div style={{ fontSize: 22 }}>{Number(value).toLocaleString()}</div>
    </div>
  );
}
