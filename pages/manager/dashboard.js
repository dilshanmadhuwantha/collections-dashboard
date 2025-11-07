import { useEffect, useMemo, useRef, useState } from "react";
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

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

const toNum = (v) => Number(v || 0);
const fmt = (n) => new Intl.NumberFormat().format(toNum(n));
const byStrAsc = (a, b) => (a > b ? 1 : a < b ? -1 : 0);

/** Convert a record (Airtable row) to a normalized shape with safeDate (YYYY-MM-DD). */
function normalizeRow(r) {
  const dateRaw = r?.date || r?.created_at || "";
  const safeDate = String(dateRaw).slice(0, 10);
  return { ...r, safeDate };
}

/** Group array by key selector fn. Returns Map<key, array>. */
function groupBy(items, keyFn) {
  const m = new Map();
  items.forEach((it) => {
    const k = keyFn(it);
    m.set(k, (m.get(k) || []).concat(it));
  });
  return m;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ManagerDashboard() {
  // Raw & filtered data
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // Filters
  const [mode, setMode] = useState("single"); // "single" | "range"
  const [singleDate, setSingleDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [agent, setAgent] = useState("All");
  const [criterion, setCriterion] = useState("All"); // affects filtering section
  const [bucket, setBucket] = useState("All"); // only for Money Collection (filter)

  // Trend controls (metric + bucket for money)
  const [trendMetric, setTrendMetric] = useState("Money Collection");
  const [trendBucket, setTrendBucket] = useState("Hard");

  // Export refs
  const captureRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Load Data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) {
        const normalized = json.data.map(normalizeRow);

        setRows(normalized);

        // Auto-select newest date
        const newest =
          normalized
            .map((r) => r.safeDate)
            .filter(Boolean)
            .sort()
            .reverse()[0] || "";
        setSingleDate(newest);
      }
    }
    load();
  }, []);

  // Derived lists for dropdowns
  const agentList = useMemo(
    () => Array.from(new Set(rows.map((r) => r.Employee))).sort(byStrAsc),
    [rows]
  );
  const criterionList = useMemo(
    () => Array.from(new Set(rows.map((r) => r.Criterion))).sort(byStrAsc),
    [rows]
  );
  const bucketList = ["PreDue", "Soft", "Medium", "Hard", "RES"];

  // ---------------------------------------------------------------------------
  // Apply Filters
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let f = [...rows];

    // Date
    if (mode === "single" && singleDate) {
      f = f.filter((r) => r.safeDate === singleDate);
    }
    if (mode === "range" && rangeStart && rangeEnd) {
      f = f.filter((r) => r.safeDate >= rangeStart && r.safeDate <= rangeEnd);
    }

    // Agent
    if (agent !== "All") f = f.filter((r) => r.Employee === agent);

    // Criterion
    if (criterion !== "All") f = f.filter((r) => r.Criterion === criterion);

    // Bucket (only for Money Collection)
    if (criterion === "Money Collection" && bucket !== "All") {
      f = f.filter((r) => r.Subcategory === bucket);
    }

    setFiltered(f);
  }, [rows, mode, singleDate, rangeStart, rangeEnd, agent, criterion, bucket]);

  // ---------------------------------------------------------------------------
  // KPIs
  // ---------------------------------------------------------------------------
  const sum = (crit) =>
    filtered
      .filter((r) => r.Criterion === crit)
      .reduce((t, r) => t + toNum(r.Value), 0);

  const kpiCall = sum("Call Count");
  const kpiMoney = sum("Money Collection");
  const kpiPTP = sum("PTP Count");
  const kpiLogin = sum("Login Time");

  // ---------------------------------------------------------------------------
  // Trend Data (by date for trendMetric)
  // For Money Collection we also use trendBucket
  // ---------------------------------------------------------------------------
  const trendData = useMemo(() => {
    let list = filtered;
    if (trendMetric === "Money Collection" && trendBucket) {
      list = list.filter((r) => r.Subcategory === trendBucket);
    } else {
      list = list.filter((r) => r.Criterion === trendMetric);
    }

    // Group by day
    const byDay = groupBy(list, (r) => r.safeDate);
    const out = [...byDay.entries()]
      .map(([date, arr]) => ({
        date,
        value: arr.reduce((t, r) => t + toNum(r.Value), 0),
      }))
      .sort((a, b) => byStrAsc(a.date, b.date));
    return out;
  }, [filtered, trendMetric, trendBucket]);

  // ---------------------------------------------------------------------------
  // Agent Breakdown (sum by agent for the selected criterion/bucket & filters)
  // ---------------------------------------------------------------------------
  const agentBreakdown = useMemo(() => {
    // Focus on whichever *analysis* you want: use `criterion` from filter.
    let list = filtered;

    // If user picked a specific criterion, breakdown that; else fallback to Money Collection
    const breakdownCriterion = criterion === "All" ? "Money Collection" : criterion;

    list = list.filter((r) => r.Criterion === breakdownCriterion);

    // If Money Collection and bucket filter is set (and not "All"), apply it
    if (breakdownCriterion === "Money Collection" && bucket !== "All") {
      list = list.filter((r) => r.Subcategory === bucket);
    }

    // Group by employee
    const byAgent = groupBy(list, (r) => r.Employee);
    const out = [...byAgent.entries()]
      .map(([name, arr]) => ({
        agent: name,
        value: arr.reduce((t, x) => t + toNum(x.Value), 0),
      }))
      .sort((a, b) => b.value - a.value);

    return { criterion: breakdownCriterion, data: out };
  }, [filtered, criterion, bucket]);

  // ---------------------------------------------------------------------------
  // Export: CSV (Excel-friendly)
  // ---------------------------------------------------------------------------
  const exportCSV = () => {
    if (filtered.length === 0) return;

    const header = [
      "date",
      "Employee",
      "Employee ID",
      "Criterion",
      "Subcategory",
      "Value",
      "uploaded_by",
      "source_upload",
    ];
    const rowsCSV = filtered.map((r) => [
      r.safeDate,
      r.Employee || "",
      r["Employee ID"] || "",
      r.Criterion || "",
      r.Subcategory || "",
      r.Value || "",
      r.uploaded_by || "",
      r.source_upload || "",
    ]);

    const csv = [header, ...rowsCSV].map((x) => x.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered_stats.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // Export: PDF (capture main area)
  // ---------------------------------------------------------------------------
  const exportPDF = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const node = captureRef.current;
      if (!node) return;

      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "l", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.text("Collections Dashboard (Filtered)", 20, 24);
      pdf.addImage(imgData, "PNG", 20, 40, imgWidth, Math.min(imgHeight, pageHeight - 60));
      pdf.save("dashboard.pdf");
    } catch (e) {
      console.error("PDF export error:", e);
      alert("PDF export failed. See console for details.");
    }
  };

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const styles = getStyles();

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>Collections Dashboard</div>

        {/* Filter Mode */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Filter Mode</div>
          <label style={styles.radio}>
            <input
              type="radio"
              checked={mode === "single"}
              onChange={() => setMode("single")}
            />
            <span>Single Day</span>
          </label>
          <label style={styles.radio}>
            <input
              type="radio"
              checked={mode === "range"}
              onChange={() => setMode("range")}
            />
            <span>Date Range</span>
          </label>
        </div>

        {/* Dates */}
        {mode === "single" ? (
          <div style={styles.section}>
            <div style={styles.label}>Select Date</div>
            <input
              type="date"
              value={singleDate || ""}
              onChange={(e) => setSingleDate(e.target.value)}
              style={styles.input}
            />
          </div>
        ) : (
          <div style={styles.section}>
            <div style={styles.label}>Start Date</div>
            <input
              type="date"
              value={rangeStart || ""}
              onChange={(e) => setRangeStart(e.target.value)}
              style={styles.input}
            />
            <div style={{ height: 8 }} />
            <div style={styles.label}>End Date</div>
            <input
              type="date"
              value={rangeEnd || ""}
              onChange={(e) => setRangeEnd(e.target.value)}
              style={styles.input}
            />
          </div>
        )}

        {/* Agent */}
        <div style={styles.section}>
          <div style={styles.label}>Agent</div>
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            style={styles.select}
          >
            <option>All</option>
            {agentList.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Criterion */}
        <div style={styles.section}>
          <div style={styles.label}>Criterion</div>
          <select
            value={criterion}
            onChange={(e) => {
              setCriterion(e.target.value);
              // Reset bucket if criterion changed away from Money Collection
              if (e.target.value !== "Money Collection") setBucket("All");
            }}
            style={styles.select}
          >
            <option>All</option>
            {criterionList.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Bucket (Money Collection only) */}
        {criterion === "Money Collection" && (
          <div style={styles.section}>
            <div style={styles.label}>Bucket</div>
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              style={styles.select}
            >
              <option>All</option>
              {bucketList.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
        )}

        {/* Exports */}
        <div style={styles.section}>
          <button onClick={exportCSV} style={styles.btn}>
            ⬇️ Export CSV
          </button>
          <button onClick={exportPDF} style={{ ...styles.btn, marginTop: 8 }}>
            🧾 Download PDF
          </button>
        </div>

        <div style={styles.tip}>
          Tip: The dashboard auto-selects the <b>newest date</b> with data.
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div ref={captureRef}>
          <header style={styles.header}>
            <div>
              <h1 style={styles.h1}>Manager Dashboard</h1>
              <div style={styles.subtle}>
                Total rows after filters: <b>{filtered.length}</b>{" "}
                {mode === "single" ? (
                  <>
                    • Date: <b>{singleDate || "-"}</b>
                  </>
                ) : (
                  <>
                    • Range: <b>{rangeStart || "-"}</b> → <b>{rangeEnd || "-"}</b>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* KPIs */}
          <section style={styles.kpiRow}>
            <Kpi title="Call Count" value={fmt(kpiCall)} />
            <Kpi title="Money Collection" value={fmt(kpiMoney)} />
            <Kpi title="PTP Count" value={fmt(kpiPTP)} />
            <Kpi title="Login Time" value={fmt(kpiLogin)} />
          </section>

          {/* Trend Controls */}
          <section style={{ marginTop: 18 }}>
            <div style={styles.box}>
              <div style={styles.boxHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📈</span>
                  <span>
                    Trend — {trendMetric}
                    {trendMetric === "Money Collection" ? ` (${trendBucket})` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={trendMetric}
                    onChange={(e) => setTrendMetric(e.target.value)}
                    style={styles.selectLight}
                  >
                    <option>Money Collection</option>
                    <option>Call Count</option>
                    <option>PTP Count</option>
                    <option>Login Time</option>
                  </select>
                  {trendMetric === "Money Collection" && (
                    <select
                      value={trendBucket}
                      onChange={(e) => setTrendBucket(e.target.value)}
                      style={styles.selectLight}
                    >
                      {bucketList.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div style={{ padding: 12, height: 340 }}>
                {trendData.length === 0 ? (
                  <div style={styles.noData}>No data</div>
                ) : (
                  <ResponsiveContainer>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="4 4" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          {/* Agent Breakdown */}
          <section style={{ marginTop: 18 }}>
            <div style={styles.box}>
              <div style={styles.boxHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>👥</span>
                  <span>
                    Agent Breakdown — {agentBreakdown.criterion}
                    {agentBreakdown.criterion === "Money Collection" && bucket !== "All"
                      ? ` (${bucket})`
                      : ""}
                  </span>
                </div>
              </div>
              <div style={{ padding: 12 }}>
                {/* Bar Chart */}
                <div style={{ height: 320 }}>
                  {agentBreakdown.data.length === 0 ? (
                    <div style={styles.noData}>No data</div>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={agentBreakdown.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="agent" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Total" fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Table */}
                <div style={{ marginTop: 16, overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Agent</th>
                        <th style={styles.th}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentBreakdown.data.map((r, idx) => (
                        <tr key={r.agent}>
                          <td style={styles.td}>{idx + 1}</td>
                          <td style={styles.td}>{r.agent}</td>
                          <td style={styles.td}>{fmt(r.value)}</td>
                        </tr>
                      ))}
                      {agentBreakdown.data.length === 0 && (
                        <tr>
                          <td style={styles.td} colSpan={3}>
                            No rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Subcomponents & Styles
// -----------------------------------------------------------------------------

function Kpi({ title, value }) {
  return (
    <div style={stylesCard.card}>
      <div style={stylesCard.title}>{title}</div>
      <div style={stylesCard.value}>{value}</div>
    </div>
  );
}

const stylesCard = {
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    minWidth: 220,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: "#6b7280",
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: 900,
  },
};

function getStyles() {
  return {
    container: {
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
      overflowY: "auto",
      padding: 18,
    },
    brand: {
      fontSize: 18,
      fontWeight: 800,
      letterSpacing: 0.3,
      marginBottom: 12,
    },
    section: { marginTop: 12 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: "#9aa2b1",
      textTransform: "uppercase",
      marginBottom: 6,
    },
    radio: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
      cursor: "pointer",
    },
    label: {
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
      WebkitAppearance: "menulist",
      MozAppearance: "menulist",
    },
    select: {
      width: "100%",
      padding: "8px 10px",
      background: "#0f172a",
      border: "1px solid #1f2937",
      borderRadius: 8,
      color: "#e5e7eb",
      outline: "none",
    },
    btn: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid #334155",
      background: "#0f172a",
      color: "#e5e7eb",
      cursor: "pointer",
    },
    tip: { fontSize: 12, color: "#9aa2b1", marginTop: 10 },

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
    h1: { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 0.2 },
    subtle: { color: "#6b7280", marginTop: 4, fontSize: 13 },

    kpiRow: {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 14,
    },

    box: {
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    },
    boxHeader: {
      height: 50,
      padding: "0 14px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontWeight: 800,
    },

    selectLight: {
      padding: "6px 8px",
      borderRadius: 8,
      border: "1px solid #d1d5db",
      background: "#ffffff",
      color: "#0f172a",
      outline: "none",
    },

    noData: {
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6b7280",
      fontStyle: "italic",
      border: "1px dashed #e5e7eb",
      borderRadius: 8,
    },

    table: {
      width: "100%",
      borderCollapse: "collapse",
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      overflow: "hidden",
    },
    th: {
      textAlign: "left",
      padding: "10px 12px",
      fontSize: 13,
      color: "#6b7280",
      borderBottom: "1px solid #e5e7eb",
    },
    td: {
      padding: "10px 12px",
      borderBottom: "1px solid #f1f5f9",
      fontSize: 14,
    },
  };
}
