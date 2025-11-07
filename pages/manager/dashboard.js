import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from "recharts";

// ------- Small helpers -------
const fmt = (n) => new Intl.NumberFormat().format(Number(n || 0));
const toDateKey = (d) => new Date(d).toISOString().split("T")[0];

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);

  // Filters
  const [mode, setMode] = useState("single"); // "single" | "range"
  const [selectedDate, setSelectedDate] = useState(""); // yyyy-mm-dd
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("All");
  const [selectedCriterion, setSelectedCriterion] = useState("All");

  // Load all data
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) setRows(json.data || []);
    }
    load();
  }, []);

  // ✅ Auto-select latest date (Step 2)
  useEffect(() => {
    if (!rows?.length || selectedDate) return;
    const latest = rows
      .map((r) => new Date(r.created_at))
      .filter((d) => !isNaN(d))
      .sort((a, b) => b - a)[0];
    if (latest) setSelectedDate(toDateKey(latest));
  }, [rows, selectedDate]);

  // Derived lists for dropdowns
  const agents = useMemo(
    () => Array.from(new Set(rows.map((r) => r.Employee))).sort(),
    [rows]
  );
  const criteria = useMemo(
    () => Array.from(new Set(rows.map((r) => r.Criterion))).sort(),
    [rows]
  );

  // Apply filters
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // date filter
      const d = new Date(r.created_at);
      if (isNaN(d)) return false;

      if (mode === "single" && selectedDate) {
        if (!r.created_at.startsWith(selectedDate)) return false;
      }
      if (mode === "range" && startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (d < s || d > e) return false;
      }

      // agent filter
      if (selectedAgent !== "All" && r.Employee !== selectedAgent) return false;

      // criterion filter
      if (selectedCriterion !== "All" && r.Criterion !== selectedCriterion)
        return false;

      return true;
    });
  }, [rows, mode, selectedDate, startDate, endDate, selectedAgent, selectedCriterion]);

  // KPIs (filtered)
  const callCount = useMemo(
    () =>
      filtered
        .filter((r) => r.Criterion === "Call Count")
        .reduce((a, b) => a + Number(b.Value || 0), 0),
    [filtered]
  );

  const moneyCollection = useMemo(
    () =>
      filtered
        .filter((r) => r.Criterion === "Money Collection")
        .reduce((a, b) => a + Number(b.Value || 0), 0),
    [filtered]
  );

  const ptpCount = useMemo(
    () =>
      filtered
        .filter((r) => r.Criterion === "PTP Count")
        .reduce((a, b) => a + Number(b.Value || 0), 0),
    [filtered]
  );

  const loginTime = useMemo(
    () =>
      filtered
        .filter((r) => r.Criterion === "Login Time")
        .reduce((a, b) => a + Number(b.Value || 0), 0),
    [filtered]
  );

  // Trend example (Money Collection - Hard) across current filter dates
  const trendHard = useMemo(() => {
    // group by date
    const map = new Map();
    filtered
      .filter(
        (r) => r.Criterion === "Money Collection" && (r.Subcategory || "") === "Hard"
      )
      .forEach((r) => {
        const k = toDateKey(r.created_at);
        map.set(k, (map.get(k) || 0) + Number(r.Value || 0));
      });

    // sort by date key
    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([date, value]) => ({ date, value }));
  }, [filtered]);

  // Simple per-day Call Count bar (by agent) for the selected day (if single mode)
  const callCountByAgent = useMemo(() => {
    if (mode !== "single" || !selectedDate) return [];
    const map = new Map();
    filtered
      .filter((r) => r.Criterion === "Call Count" && r.created_at.startsWith(selectedDate))
      .forEach((r) => {
        const a = r.Employee;
        map.set(a, (map.get(a) || 0) + Number(r.Value || 0));
      });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([agent, value]) => ({ agent, value }));
  }, [filtered, mode, selectedDate]);

  return (
    <div style={styles.app}>
      {/* ====== Sidebar (Dark) ====== */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarInner}>
          <div style={styles.brand}>Collections Dashboard</div>

          <div style={styles.sectionTitle}>Filter Mode</div>
          <div style={styles.radioRow}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                checked={mode === "single"}
                onChange={() => setMode("single")}
              />
              <span>Single Day</span>
            </label>
            <label style={{ ...styles.radioLabel, marginLeft: 14 }}>
              <input
                type="radio"
                checked={mode === "range"}
                onChange={() => setMode("range")}
              />
              <span>Date Range</span>
            </label>
          </div>

          {mode === "single" ? (
            <div style={styles.field}>
              <label style={styles.label}>Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.input}
              />
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={styles.field}>
                <label style={styles.label}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={styles.select}
            >
              <option value="All">All</option>
              {agents.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Criterion</label>
            <select
              value={selectedCriterion}
              onChange={(e) => setSelectedCriterion(e.target.value)}
              style={styles.select}
            >
              <option value="All">All</option>
              {criteria.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 18, fontSize: 12, color: "#9aa2b1" }}>
            Tip: The dashboard auto-selects the <b>newest date</b> with data.
          </div>
        </div>
      </aside>

      {/* ====== Main (Light) ====== */}
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>Manager Dashboard</h1>
            <div style={styles.subtle}>
              Total rows after filters: <b>{filtered.length}</b>
              {"  "}•{"  "}
              Mode: <b>{mode === "single" ? `Single — ${selectedDate || "-"}` : `${startDate || "-"} → ${endDate || "-"}`}</b>
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
          <KpiCard title="Call Count" emoji="📞" value={fmt(callCount)} />
          <KpiCard title="Money Collection" emoji="💰" value={fmt(moneyCollection)} />
          <KpiCard title="PTP Count" emoji="🤝" value={fmt(ptpCount)} />
          <KpiCard title="Login Time" emoji="⏱" value={fmt(loginTime)} />
        </section>

        {/* Trend */}
        <section style={{ marginTop: 22 }}>
          <Box title="Trend — Money Collection (Hard)">
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={trendHard}>
                  <CartesianGrid strokeDasharray="4 4" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Box>
        </section>

        {/* Daily Call Count by Agent (if single day) */}
        {mode === "single" && (
          <section style={{ marginTop: 22 }}>
            <Box title={`Call Count — By Agent (${selectedDate || "-"})`}>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={callCountByAgent}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="agent" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Box>
          </section>
        )}
      </main>
    </div>
  );
}

/* ---------- Small presentational components ---------- */

function KpiCard({ title, emoji, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        <span style={{ marginRight: 8 }}>{emoji}</span>
        {title}
      </div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

function Box({ title, children }) {
  return (
    <div style={styles.box}>
      <div style={styles.boxHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: 0.7 }}>📊</span>
          <span>{title}</span>
        </div>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

/* ---------- Styles (dark sidebar + light content) ---------- */

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#f7f8fa",
    color: "#0f172a",
  },
  sidebar: {
    width: 280,
    background: "linear-gradient(180deg, #0b1220 0%, #0d1424 100%)",
    color: "#e5e7eb",
    borderRight: "1px solid #111827",
    position: "sticky",
    top: 0,
    alignSelf: "flex-start",
    height: "100vh",
  },
  sidebarInner: {
    padding: 18,
    overflowY: "auto",
    height: "100%",
  },
  brand: {
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#9aa2b1",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 8,
  },
  radioRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: 10,
  },
  radioLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    userSelect: "none",
    fontSize: 14,
  },
  field: {
    marginTop: 12,
  },
  label: {
    display: "block",
    fontSize: 12,
    color: "#9aa2b1",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    background: "#0f172a",
    border: "1px solid #1f2937",
    borderRadius: 8,
    color: "#e5e7eb",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: "8px 10px",
    background: "#0f172a",
    border: "1px solid #1f2937",
    borderRadius: 8,
    color: "#e5e7eb",
    outline: "none",
    appearance: "none",
  },
  main: {
    flex: 1,
    padding: 22,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
  },
  h1: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  subtle: {
    color: "#6b7280",
    marginTop: 4,
    fontSize: 13,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#6b7280",
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
  },
  cardValue: {
    fontSize: 22,
    fontWeight: 900,
  },
  box: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  boxHeader: {
    height: 46,
    padding: "0 14px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    fontWeight: 800,
  },
};
