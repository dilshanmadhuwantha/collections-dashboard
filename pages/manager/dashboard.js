// Manager Dashboard with KPI Targets, Gradient Colors, PDF/Excel export, Trend, Rankings
// Drop-in replacement for pages/manager/dashboard.js

import { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";

// =====================
// KPI CONFIG (edit this)
// =====================
const KPI = {
  callPerDay: 250, // calls per agent per day
  loginMinutesPerDay: 8 * 60, // 8 hours
  moneyMonthly: {
    most: 6_000_000, // LKR per month
    newcomer: 4_000_000, // LKR per month
  },
  // Map each agent to a tier ("most" or "newcomer").
  // If an agent is not listed here, they'll default to "most".
  agentTier: {
    // Example:
    // "Amandi Upeksha": "most",
    // "New Joiner": "newcomer",
  },
};

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);

  // Sidebar Filters
  const [mode, setMode] = useState("single"); // single | range
  const [singleDate, setSingleDate] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(new Date());
  const [rangeEnd, setRangeEnd] = useState(new Date());
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("All");
  const [criterion, setCriterion] = useState("All");
  const [subcategory, setSubcategory] = useState("All");
  const MONEY_BUCKETS = ["PreDue", "Soft", "Medium", "Hard", "RES"];

  // Trend controls
  const [trendMetric, setTrendMetric] = useState("Money Collection");
  const [trendBucket, setTrendBucket] = useState("Hard");

  const reportRef = useRef(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) {
        setRows(json.data);
        setAgents([...new Set(json.data.map((r) => r.Employee))].sort());
      }
    }
    load();
  }, []);

  const getDateKey = (v) => {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d)) return null;
    return d.toISOString().split("T")[0];
  };

  // Helper: days in month for a given Date
  const daysInMonth = (date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    return new Date(y, m + 1, 0).getDate();
  };

  // Build list of date keys for current selection
  const dateKeysInSelection = useMemo(() => {
    const start = mode === "single"
      ? new Date(singleDate.toISOString().split("T")[0])
      : new Date(rangeStart.toISOString().split("T")[0]);
    const end = mode === "single"
      ? new Date(singleDate.toISOString().split("T")[0])
      : new Date(rangeEnd.toISOString().split("T")[0]);
    const out = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push(new Date(d).toISOString().split("T")[0]);
    }
    return out;
  }, [mode, singleDate, rangeStart, rangeEnd]);

  const daysSelected = dateKeysInSelection.length;

  // =====================
  // KPI TARGET CALCULATIONS
  // =====================
  const getAgentTier = (agent) => KPI.agentTier[agent] || "most";

  // Money target for a given agent over current selection.
  // We prorate a monthly target to daily portions per month and sum days.
  const moneyTargetForAgent = (agent) => {
    if (daysSelected === 0) return 0;
    const tier = getAgentTier(agent);
    // Sum over the selected days, per month, monthlyTarget / daysInMonth
    let total = 0;
    const perDayByMonthCache = new Map(); // key: YYYY-MM -> per-day target
    for (const key of dateKeysInSelection) {
      const d = new Date(key);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!perDayByMonthCache.has(ym)) {
        const dim = daysInMonth(d);
        const monthly = KPI.moneyMonthly[tier] || KPI.moneyMonthly.most;
        perDayByMonthCache.set(ym, monthly / dim);
      }
      total += perDayByMonthCache.get(ym);
    }
    return total;
  };

  // Call & Login targets for selection (same for all agents)
  const callTargetForSelection = KPI.callPerDay * Math.max(1, daysSelected);
  const loginTargetForSelection = KPI.loginMinutesPerDay * Math.max(1, daysSelected);

  // Color scale: ratio 0.0 -> red, 1.0 -> green (HSL from 0 to 120deg)
  const colorForRatio = (ratio) => {
    const r = Math.max(0, Math.min(ratio, 1.2));
    const hue = Math.round(Math.min(120, r * 120));
    return `hsl(${hue} 70% 45%)`;
  };

  // Apply filters to base rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const rowDateKey = getDateKey(row.created_at);
      if (!rowDateKey) return false;
      const rowDate = new Date(rowDateKey);

      if (mode === "single") {
        const selKey = new Date(singleDate.toISOString().split("T")[0]).getTime();
        if (rowDate.getTime() !== selKey) return false;
      } else {
        const start = new Date(rangeStart.toISOString().split("T")[0]);
        const end = new Date(rangeEnd.toISOString().split("T")[0]);
        if (rowDate < start || rowDate > end) return false;
      }

      if (selectedAgent !== "All" && row.Employee !== selectedAgent) return false;
      if (criterion !== "All" && row.Criterion !== criterion) return false;
      if (criterion === "Money Collection" && subcategory !== "All") {
        if (row.Subcategory !== subcategory) return false;
      }
      return true;
    });
  }, [rows, mode, singleDate, rangeStart, rangeEnd, selectedAgent, criterion, subcategory]);

  // ===== Grouped data for per-day charts =====
  const grouped = useMemo(() => {
    const g = {};
    filteredRows.forEach((row) => {
      const dateKey = getDateKey(row.created_at);
      if (!dateKey) return;
      if (!g[dateKey]) {
        g[dateKey] = {
          "Call Count": {},
          "Money Collection": { PreDue: {}, Soft: {}, Medium: {}, Hard: {}, RES: {} },
          "PTP Count": {},
          "Login Time": {},
          _moneyOverall: {}, // sum of all buckets
        };
      }
      const val = Number(row.Value || 0);
      const agent = row.Employee;

      if (row.Criterion === "Call Count") {
        g[dateKey]["Call Count"][agent] = (g[dateKey]["Call Count"][agent] || 0) + val;
      }
      if (row.Criterion === "Money Collection") {
        const b = row.Subcategory || "Soft";
        if (g[dateKey]["Money Collection"][b]) {
          g[dateKey]["Money Collection"][b][agent] =
            (g[dateKey]["Money Collection"][b][agent] || 0) + val;
        }
        g[dateKey]._moneyOverall[agent] = (g[dateKey]._moneyOverall[agent] || 0) + val;
      }
      if (row.Criterion === "PTP Count") {
        g[dateKey]["PTP Count"][agent] = (g[dateKey]["PTP Count"][agent] || 0) + val;
      }
      if (row.Criterion === "Login Time") {
        g[dateKey]["Login Time"][agent] = (g[dateKey]["Login Time"][agent] || 0) + val;
      }
    });
    return g;
  }, [filteredRows]);

  const toChart = (obj) => Object.entries(obj).map(([agent, value]) => ({ agent, value }));

  // ===== Agent Rankings with KPI colors =====
  const rankings = useMemo(() => {
    const acc = {};
    const ensure = (a) => (acc[a] ||= { agent: a, call: 0, money: 0, ptp: 0, login: 0 });

    filteredRows.forEach((r) => {
      const a = r.Employee;
      const v = Number(r.Value || 0);
      ensure(a);
      if (r.Criterion === "Call Count") acc[a].call += v;
      if (r.Criterion === "Money Collection") acc[a].money += v;
      if (r.Criterion === "PTP Count") acc[a].ptp += v;
      if (r.Criterion === "Login Time") acc[a].login += v;
    });

    const list = Object.values(acc);
    const top = (key) => [...list].sort((x, y) => y[key] - x[key]).slice(0, 10);

    // Attach KPI ratios for coloring
    const withRatios = (items, key, targetGetter) =>
      items.map((it) => ({
        ...it,
        _ratio: targetGetter ? (targetGetter(it.agent) > 0 ? it[key] / targetGetter(it.agent) : 0) : null,
      }));

    return {
      call: withRatios(top("call"), "call", () => callTargetForSelection),
      money: withRatios(top("money"), "money", (agent) => moneyTargetForAgent(agent)),
      ptp: top("ptp"), // no targets defined
      login: withRatios(top("login"), "login", () => loginTargetForSelection),
    };
  }, [filteredRows, callTargetForSelection, loginTargetForSelection]);

  // ===== Export to Excel =====
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const rowsForSheet = filteredRows.map((r) => ({
      Date: getDateKey(r.created_at),
      Employee: r.Employee,
      "Employee ID": r["Employee ID"],
      Criterion: r.Criterion,
      Subcategory: r.Subcategory,
      Value: r.Value,
      "Uploaded By": r.uploaded_by || "",
      Source: r.source_upload || "",
    }));
    const ws1 = XLSX.utils.json_to_sheet(rowsForSheet);
    XLSX.utils.book_append_sheet(wb, ws1, "Filtered Rows");

    XLSX.writeFile(wb, "dashboard.xlsx");
  };

  // ===== Export to PDF =====
  const exportPDF = async () => {
    if (!reportRef.current) return;
    const node = reportRef.current;

    const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#fff" });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const filenameBase =
      mode === "single"
        ? `report_${new Date(singleDate).toISOString().slice(0, 10)}`
        : `report_${new Date(rangeStart).toISOString().slice(0, 10)}_to_${new Date(rangeEnd).toISOString().slice(0, 10)}`;

    pdf.save(`${filenameBase}.pdf`);
  };

  // ===== Trend data (multi-day lines) =====
  const trendData = useMemo(() => {
    const days = dateKeysInSelection;
    const agentSet = new Set();
    const perDay = {};
    days.forEach((k) => (perDay[k] = {}));

    filteredRows.forEach((r) => {
      if (trendMetric !== r.Criterion) return;
      if (trendMetric === "Money Collection" && trendBucket && trendBucket !== "All") {
        if (r.Subcategory !== trendBucket) return;
      }
      const dateKey = getDateKey(r.created_at);
      if (!dateKey || !(dateKey in perDay)) return;
      const a = r.Employee;
      agentSet.add(a);
      perDay[dateKey][a] = (perDay[dateKey][a] || 0) + Number(r.Value || 0);
    });

    const agentsArr = Array.from(agentSet).sort();
    const rowsForChart = days.map((k) => {
      const obj = { date: k };
      agentsArr.forEach((a) => (obj[a] = perDay[k][a] || 0));
      return obj;
    });
    return { agents: agentsArr, rows: rowsForChart };
  }, [filteredRows, trendMetric, trendBucket, dateKeysInSelection]);

  return (
    <div style={{ display: "flex", fontFamily: "Arial" }}>
      {/* SIDEBAR */}
      <div
        style={{
          width: 260,
          padding: 20,
          borderRight: "2px solid #ddd",
          height: "100vh",
          background: "#fafafa",
          position: "fixed",
          overflowY: "auto",
        }}
      >
        <h2>Filters</h2>

        <label style={{ fontWeight: "bold" }}>Filter Mode</label>
        <div>
          <input type="radio" checked={mode === "single"} onChange={() => setMode("single")} /> Single Day
          <br />
          <input type="radio" checked={mode === "range"} onChange={() => setMode("range")} /> Date Range
        </div>

        {mode === "single" ? (
          <div style={{ marginTop: 15 }}>
            <label style={{ fontWeight: "bold" }}>Select Date</label>
            <DatePicker selected={singleDate} onChange={(d) => setSingleDate(d)} dateFormat="yyyy-MM-dd" />
          </div>
        ) : (
          <div style={{ marginTop: 15 }}>
            <label style={{ fontWeight: "bold" }}>From</label>
            <DatePicker selected={rangeStart} onChange={(d) => setRangeStart(d)} dateFormat="yyyy-MM-dd" />
            <br />
            <label style={{ fontWeight: "bold" }}>To</label>
            <DatePicker selected={rangeEnd} onChange={(d) => setRangeEnd(d)} dateFormat="yyyy-MM-dd" />
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <label style={{ fontWeight: "bold" }}>Agent</label>
          <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} style={{ width: "100%", padding: 6 }}>
            <option value="All">All</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 20 }}>
          <label style={{ fontWeight: "bold" }}>Criterion</label>
          <select value={criterion} onChange={(e) => setCriterion(e.target.value)} style={{ width: "100%", padding: 6 }}>
            <option value="All">All</option>
            <option value="Call Count">Call Count</option>
            <option value="Money Collection">Money Collection</option>
            <option value="PTP Count">PTP Count</option>
            <option value="Login Time">Login Time</option>
          </select>
        </div>

        {criterion === "Money Collection" && (
          <div style={{ marginTop: 20 }}>
            <label style={{ fontWeight: "bold" }}>Subcategory</label>
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} style={{ width: "100%", padding: 6 }}>
              <option value="All">All</option>
              {MONEY_BUCKETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button onClick={exportExcel} style={{ width: "100%", padding: "10px 12px", border: "1px solid #aaa", borderRadius: 6, cursor: "pointer", background: "#fff" }}>
            📥 Export to Excel
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={exportPDF} style={{ width: "100%", padding: "10px 12px", border: "1px solid #aaa", borderRadius: 6, cursor: "pointer", background: "#fff" }}>
            🧾 Download PDF Report
          </button>
        </div>

        {/* Trend Controls */}
        <div style={{ marginTop: 28 }}>
          <h3 style={{ margin: "8px 0" }}>Trend Chart</h3>
          <label style={{ fontWeight: "bold" }}>Metric</label>
          <select value={trendMetric} onChange={(e) => setTrendMetric(e.target.value)} style={{ width: "100%", padding: 6 }}>
            <option value="Call Count">Call Count</option>
            <option value="Money Collection">Money Collection</option>
            <option value="PTP Count">PTP Count</option>
            <option value="Login Time">Login Time</option>
          </select>

          {trendMetric === "Money Collection" && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontWeight: "bold" }}>Bucket</label>
              <select value={trendBucket} onChange={(e) => setTrendBucket(e.target.value)} style={{ width: "100%", padding: 6 }}>
                {MONEY_BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div ref={reportRef} style={{ marginLeft: 300, padding: 20, width: "100%" }}>
        <h1>Manager Dashboard</h1>
        <p>
          Total rows after filters: {filteredRows.length}
          {" "}| Days in selection: {daysSelected}
        </p>

        {/* Agent Rankings with KPI coloring dots */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 10 }}>
          <RankingCard title="🏆 Call Count" items={rankings.call} field="call" getRatio={(it) => it._ratio} colorForRatio={colorForRatio} />
          <RankingCard title="💰 Money Collection" items={rankings.money} field="money" getRatio={(it) => it._ratio} colorForRatio={colorForRatio} />
          <RankingCard title="🤝 PTP Count" items={rankings.ptp} field="ptp" />
          <RankingCard title="⏱️ Login Time" items={rankings.login} field="login" getRatio={(it) => it._ratio} colorForRatio={colorForRatio} />
        </div>

        {/* ===== Trend ===== */}
        <div style={{ marginTop: 28 }}>
          <h2>
            📈 Trend – {trendMetric}
            {trendMetric === "Money Collection" ? ` (${trendBucket})` : ""}
          </h2>
          {/* Render multi-line chart */}
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <LineChart data={useMemo(() => trendData.rows, [trendData.rows])} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {trendData.agents.map((a, i) => (
                  <Line key={a} type="monotone" dataKey={a} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ===== Per-day Charts ===== */}
        {Object.entries(grouped).map(([date, data]) => (
          <div key={date} style={{ marginTop: 40 }}>
            <h2>📅 {date}</h2>

            {/* Call Count with KPI coloring vs fixed per-day target */}
            <h3>Call Count</h3>
            <ChartWithKPI
              data={toChart(data["Call Count"]) }
              getTarget={(agent) => callTargetForSelection}
              colorForRatio={colorForRatio}
            />

            {/* Money overall (sum across buckets) with KPI coloring */}
            <h3>Money Collection — Overall</h3>
            <ChartWithKPI
              data={toChart(data._moneyOverall)}
              getTarget={(agent) => moneyTargetForAgent(agent)}
              colorForRatio={colorForRatio}
              money
            />

            {/* Buckets (neutral colors, no KPI since target is overall monthly) */}
            <h3>Money Collection — Buckets</h3>
            {MONEY_BUCKETS.map((b) => (
              <div key={b}>
                <h4>{b}</h4>
                <PlainBar data={toChart(data["Money Collection"][b])} />
              </div>
            ))}

            <h3>PTP Count</h3>
            <PlainBar data={toChart(data["PTP Count"])} />

            <h3>Login Time</h3>
            <ChartWithKPI
              data={toChart(data["Login Time"])}
              getTarget={() => loginTargetForSelection}
              colorForRatio={colorForRatio}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Reusable Charts =====
function PlainBar({ data }) {
  if (!data || data.length === 0) return <p style={{ color: "gray" }}>No data</p>;
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="agent" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartWithKPI({ data, getTarget, colorForRatio }) {
  if (!data || data.length === 0) return <p style={{ color: "gray" }}>No data</p>;
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="agent" />
          <YAxis />
          <Tooltip formatter={(val, name, props) => {
            const agent = props && props.payload ? props.payload.agent : "";
            const tgt = getTarget ? getTarget(agent) : 0;
            const ratio = tgt > 0 ? Number(val) / tgt : 0;
            return [val, `${name} (Target: ${Math.round(tgt).toLocaleString()} | ${(ratio*100).toFixed(0)}%)`];
          }} />
          <Legend />
          <Bar dataKey="value">
            {data.map((entry, index) => {
              const tgt = getTarget ? getTarget(entry.agent) : 0;
              const ratio = tgt > 0 ? entry.value / tgt : 0;
              return <Cell key={`cell-${index}`} fill={colorForRatio ? colorForRatio(ratio) : "#007bff"} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== Cards =====
function RankingCard({ title, items, field, getRatio, colorForRatio }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {(!items || items.length === 0) && <div style={{ color: "#666" }}>No data</div>}
      {items &&
        items.map((x, i) => {
          const ratio = getRatio ? getRatio(x) : null;
          const dot = ratio != null ? (
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 999,
                background: colorForRatio(ratio),
                marginRight: 8,
              }}
            />
          ) : null;
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span>
                {dot}
                {i + 1}. {x.agent}
              </span>
              <span style={{ fontWeight: 700 }}>{formatNumber(x[field])}</span>
            </div>
          );
        })}
    </div>
  );
}

function formatNumber(n) {
  if (n === undefined || n === null || isNaN(n)) return "0";
  return new Intl.NumberFormat().format(Number(n));
}
