import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";
import * as XLSX from "xlsx";

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
  const [trendMetric, setTrendMetric] = useState("Money Collection"); // Call Count | Money Collection | PTP Count | Login Time
  const [trendBucket, setTrendBucket] = useState("Hard"); // used only when Money Collection

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

  // Apply all filters to base rows
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

  // ===== Grouped data for per-day bar charts =====
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

  // ===== Agent Rankings (top 10) over the filtered set =====
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
    return {
      call: top("call"),
      money: top("money"),
      ptp: top("ptp"),
      login: top("login"),
    };
  }, [filteredRows]);

  // ===== Export to Excel (filtered rows + daily agent totals) =====
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Filtered Rows
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

    // Sheet 2: Daily Agent Totals
    const dailySummary = [];
    Object.entries(grouped).forEach(([date, data]) => {
      // Call Count
      Object.entries(data["Call Count"]).forEach(([agent, value]) => {
        dailySummary.push({ Date: date, Agent: agent, Metric: "Call Count", Value: value });
      });
      // Money Collection (each bucket)
      for (const b of ["PreDue", "Soft", "Medium", "Hard", "RES"]) {
        Object.entries(data["Money Collection"][b]).forEach(([agent, value]) => {
          dailySummary.push({ Date: date, Agent: agent, Metric: `Money Collection - ${b}`, Value: value });
        });
      }
      // PTP Count
      Object.entries(data["PTP Count"]).forEach(([agent, value]) => {
        dailySummary.push({ Date: date, Agent: agent, Metric: "PTP Count", Value: value });
      });
      // Login Time
      Object.entries(data["Login Time"]).forEach(([agent, value]) => {
        dailySummary.push({ Date: date, Agent: agent, Metric: "Login Time", Value: value });
      });
    });
    const ws2 = XLSX.utils.json_to_sheet(dailySummary);
    XLSX.utils.book_append_sheet(wb, ws2, "Daily Agent Totals");

    const filenameBase =
      mode === "single"
        ? `dashboard_${getDateKey(singleDate)}`
        : `dashboard_${getDateKey(rangeStart)}_to_${getDateKey(rangeEnd)}`;
    XLSX.writeFile(wb, `${filenameBase}.xlsx`);
  };

  // ===== Feature (3): Multi-day Trend (lines per agent) =====
  // Build date keys over the current selection
  const buildDateSeries = () => {
    // figure start/end from current mode
    const start = mode === "single"
      ? new Date(singleDate.toISOString().split("T")[0])
      : new Date(rangeStart.toISOString().split("T")[0]);
    const end = mode === "single"
      ? new Date(singleDate.toISOString().split("T")[0])
      : new Date(rangeEnd.toISOString().split("T")[0]);

    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d).toISOString().split("T")[0]);
    }
    return days;
  };

  const trendData = useMemo(() => {
    const days = buildDateSeries();
    const agentSet = new Set();
    const perDay = {}; // { dateKey: { agentName: total } }

    // initialize
    days.forEach((k) => (perDay[k] = {}));

    // filter rows only for the chosen metric/bucket
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
    // build recharts-friendly rows: { date: 'YYYY-MM-DD', 'Agent A': 10, 'Agent B': 5 }
    const rowsForChart = days.map((k) => {
      const obj = { date: k };
      agentsArr.forEach((a) => {
        obj[a] = perDay[k][a] || 0;
      });
      return obj;
    });

    return { agents: agentsArr, rows: rowsForChart };
  }, [filteredRows, mode, singleDate, rangeStart, rangeEnd, trendMetric, trendBucket]);

  // ===== Feature (4): Monthly Summary (YYYY-MM) over filteredRows =====
  const monthly = useMemo(() => {
    const sum = (a, k, v) => (a[k] = (a[k] || 0) + v);
    const out = {}; // { '2025-11': { call: X, money: Y, ptp: Z, login: W } }

    filteredRows.forEach((r) => {
      const key = getDateKey(r.created_at);
      if (!key) return;
      const ym = key.slice(0, 7); // YYYY-MM
      out[ym] ||= { call: 0, money: 0, ptp: 0, login: 0 };
      const v = Number(r.Value || 0);
      if (r.Criterion === "Call Count") sum(out[ym], "call", v);
      if (r.Criterion === "Money Collection") sum(out[ym], "money", v);
      if (r.Criterion === "PTP Count") sum(out[ym], "ptp", v);
      if (r.Criterion === "Login Time") sum(out[ym], "login", v);
    });

    // to an array
    return Object.entries(out)
      .map(([month, vals]) => ({ month, ...vals }))
      .sort((a, b) => (a.month < b.month ? -1 : 1));
  }, [filteredRows]);

  return (
    <div style={{ display: "flex", fontFamily: "Arial" }}>
      {/* SIDEBAR */}
      <div
        style={{
          width: 260, padding: 20, borderRight: "2px solid #ddd", height: "100vh",
          background: "#fafafa", position: "fixed", overflowY: "auto"
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
              <option key={a} value={a}>{a}</option>
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
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button
            onClick={exportExcel}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #aaa", borderRadius: 6, cursor: "pointer", background: "#fff" }}
          >
            📥 Export to Excel
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
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: 300, padding: 20, width: "100%" }}>
        <h1>Manager Dashboard</h1>
        <p>Total rows after filters: {filteredRows.length}</p>

        {/* Agent Rankings */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 10 }}>
          <RankingCard title="🏆 Call Count" items={rankings.call} field="call" />
          <RankingCard title="💰 Money Collection" items={rankings.money} field="money" />
          <RankingCard title="🤝 PTP Count" items={rankings.ptp} field="ptp" />
          <RankingCard title="⏱️ Login Time" items={rankings.login} field="login" />
        </div>

        {/* ===== (3) Multi-day Trend Chart ===== */}
        <div style={{ marginTop: 28 }}>
          <h2>📈 Trend – {trendMetric}{trendMetric === "Money Collection" ? ` (${trendBucket})` : ""}</h2>
          {trendData.rows.length === 0 || trendData.agents.length === 0 ? (
            <p style={{ color: "gray" }}>No data for the selected filters.</p>
          ) : (
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={trendData.rows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
          )}
        </div>

        {/* ===== Per-day Bar Charts (what you already had) ===== */}
        {Object.entries(grouped).map(([date, data]) => (
          <div key={date} style={{ marginTop: 40 }}>
            <h2>📅 {date}</h2>

            <h3>Call Count</h3>
            <Chart data={toChart(data["Call Count"])} color="#007bff" />

            <h3>Money Collection</h3>
            {["PreDue", "Soft", "Medium", "Hard", "RES"].map((b) => (
              <div key={b}>
                <h4>{b}</h4>
                <Chart data={toChart(data["Money Collection"][b])} color="#C70039" />
              </div>
            ))}

            <h3>PTP Count</h3>
            <Chart data={toChart(data["PTP Count"])} color="#FF8C00" />

            <h3>Login Time</h3>
            <Chart data={toChart(data["Login Time"])} color="#17A589" />
          </div>
        ))}

        {/* ===== (4) Monthly Summary ===== */}
        <div style={{ marginTop: 40 }}>
          <h2>📦 Monthly Summary (Filtered)</h2>
          {monthly.length === 0 ? (
            <p style={{ color: "gray" }}>No data for current filters.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <Th>Month</Th>
                    <Th>Call Count</Th>
                    <Th>Money Collection</Th>
                    <Th>PTP Count</Th>
                    <Th>Login Time</Th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={m.month}>
                      <Td>{m.month}</Td>
                      <Td>{formatNumber(m.call)}</Td>
                      <Td>{formatNumber(m.money)}</Td>
                      <Td>{formatNumber(m.ptp)}</Td>
                      <Td>{formatNumber(m.login)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Small components */
function Chart({ data, color }) {
  if (!data || data.length === 0) return <p style={{ color: "gray" }}>No data</p>;
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="agent" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankingCard({ title, items, field }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {(!items || items.length === 0) && <div style={{ color: "#666" }}>No data</div>}
      {items && items.map((x, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
          <span>{i + 1}. {x.agent}</span>
          <span style={{ fontWeight: 700 }}>{formatNumber(x[field])}</span>
        </div>
      ))}
    </div>
  );
}

function Th({ children }) {
  return <th style={{ border: "1px solid #ddd", background: "#f6f6f6", padding: 8, textAlign: "left" }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ border: "1px solid #ddd", padding: 8 }}>{children}</td>;
}

function formatNumber(n) {
  if (n === undefined || n === null || isNaN(n)) return "0";
  return new Intl.NumberFormat().format(Number(n));
}
