// pages/agent/dashboard.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";

export default function AgentDashboard() {
  const router = useRouter();
  const empId = router.query.empId;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => new Date());
  const [dateTo, setDateTo] = useState(() => new Date());

  async function load() {
    if (!empId) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("empId", String(empId));
      if (dateFrom) q.set("dateFrom", dateFrom.toISOString().slice(0, 10));
      if (dateTo) q.set("dateTo", dateTo.toISOString().slice(0, 10));
      const res = await fetch(`/api/getAgentStats?${q.toString()}`);
      const json = await res.json();
      if (json.success) setRows(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId, dateFrom, dateTo]);

  // KPI aggregation
  const kpis = useMemo(() => {
    const byKey = { call: 0, money: 0, ptp: 0, login: 0 };
    rows.forEach((r) => {
      const v = Number(r.Value || 0);
      if (r.Criterion === "Call Count") byKey.call += v;
      else if (r.Criterion === "Money Collection") byKey.money += v;
      else if (r.Criterion === "PTP Count") byKey.ptp += v;
      else if (r.Criterion === "Login Time") byKey.login += v;
    });
    return byKey;
  }, [rows]);

  // Trend by day (sum of money)
  const moneyTrend = useMemo(() => {
    const map = {};
    rows.filter(r => r.Criterion === "Money Collection").forEach((r) => {
      const d = (r.created_at || "").slice(0, 10);
      map[d] = (map[d] || 0) + Number(r.Value || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }, [rows]);

  if (!empId) {
    return (
      <div style={{ padding: 30, fontFamily: "Arial" }}>
        <h1>Agent Dashboard</h1>
        <p>Please open via <code>/agent/dashboard?empId=YOUR_ID</code></p>
      </div>
    );
  }

  return (
    <div style={{ padding: 30, fontFamily: "Arial", maxWidth: 1100, margin: "0 auto" }}>
      <h1>Agent Dashboard</h1>
      {/* Top Filters */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div><strong>Employee ID:</strong> {empId}</div>
        <div>
          <span style={{ marginRight: 6 }}>From:</span>
          <DatePicker selected={dateFrom} onChange={setDateFrom} dateFormat="yyyy-MM-dd" />
        </div>
        <div>
          <span style={{ marginRight: 6 }}>To:</span>
          <DatePicker selected={dateTo} onChange={setDateTo} dateFormat="yyyy-MM-dd" />
        </div>
        <button onClick={load} disabled={loading} style={{ padding: "6px 12px" }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Call Count" value={kpis.call} />
        <KpiCard label="Money Collection (LKR)" value={kpis.money} />
        <KpiCard label="PTP Count" value={kpis.ptp} />
        <KpiCard label="Login Time (mins)" value={kpis.login} />
      </div>

      {/* Money Trend */}
      <section style={{ height: 320 }}>
        <h3 style={{ marginBottom: 8 }}>Money Collection — Trend</h3>
        <ResponsiveContainer>
          <LineChart data={moneyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line dataKey="value" name="Money" dot />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fafafa" }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}
