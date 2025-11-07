import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  colorForRatio,
  moneyTargetForAgentOverDays,
  callTargetForDays,
  loginTargetForDays
} from "../../lib/targets";

// ---------- small utils ----------
const toNum = (v) => Number(v || 0);
const fmt = (n) => new Intl.NumberFormat().format(toNum(n));
const byStrAsc = (a, b) => (a > b ? 1 : a < b ? -1 : 0);
const normalizeRow = (r) => ({ ...r, safeDate: String(r.date || r.created_at || "").slice(0, 10) });
const groupBy = (arr, keyFn) => {
  const m = new Map();
  arr.forEach((x) => {
    const k = keyFn(x);
    m.set(k, (m.get(k) || []).concat(x));
  });
  return m;
};

export default function ManagerDashboard() {
  // raw + filtered
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // filters
  const [mode, setMode] = useState("single"); // single | range
  const [singleDate, setSingleDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [agent, setAgent] = useState("All");
  const [criterion, setCriterion] = useState("All");
  const [bucket, setBucket] = useState("All"); // only for Money Collection

  // trend controls
  const [trendMetric, setTrendMetric] = useState("Money Collection");
  const [trendBucket, setTrendBucket] = useState("Hard");

  // export capture
  const captureRef = useRef(null);

  // load data
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) {
        const norm = json.data.map(normalizeRow);
        setRows(norm);
        const newest = norm.map(r => r.safeDate).filter(Boolean).sort().reverse()[0] || "";
        setSingleDate(newest);
      }
    })();
  }, []);

  // dropdown lists
  const agentList = useMemo(
    () => Array.from(new Set(rows.map(r => r.Employee))).sort(byStrAsc),
    [rows]
  );
  const criterionList = useMemo(
    () => Array.from(new Set(rows.map(r => r.Criterion))).sort(byStrAsc),
    [rows]
  );
  const bucketList = ["PreDue", "Soft", "Medium", "Hard", "RES"];

  // apply filters
  useEffect(() => {
    let f = [...rows];
    if (mode === "single" && singleDate) {
      f = f.filter(r => r.safeDate === singleDate);
    }
    if (mode === "range" && rangeStart && rangeEnd) {
      f = f.filter(r => r.safeDate >= rangeStart && r.safeDate <= rangeEnd);
    }
    if (agent !== "All") f = f.filter(r => r.Employee === agent);
    if (criterion !== "All") f = f.filter(r => r.Criterion === criterion);
    if (criterion === "Money Collection" && bucket !== "All") {
      f = f.filter(r => r.Subcategory === bucket);
    }
    setFiltered(f);
  }, [rows, mode, singleDate, rangeStart, rangeEnd, agent, criterion, bucket]);

  // selected days list (YYYY-MM-DD)
  const selectedDays = useMemo(() => {
    const s = new Set(filtered.map(r => r.safeDate).filter(Boolean));
    return Array.from(s).sort();
  }, [filtered]);

  // KPIs
  const sum = (crit) => filtered.filter(r => r.Criterion === crit).reduce((t,r)=>t+toNum(r.Value), 0);
  const kpiCall  = sum("Call Count");
  const kpiMoney = sum("Money Collection");
  const kpiPTP   = sum("PTP Count");
  const kpiLogin = sum("Login Time");

  // KPI targets + ratios
  const kpiCallTarget  = callTargetForDays(selectedDays.length);
  const kpiLoginTarget = loginTargetForDays(selectedDays.length);

  let kpiMoneyTarget = 0;
  for (const a of new Set(filtered.map(r => r.Employee))) {
    kpiMoneyTarget += moneyTargetForAgentOverDays(a, selectedDays);
  }
  const ratioCall  = kpiCallTarget  ? kpiCall  / kpiCallTarget  : 0;
  const ratioMoney = kpiMoneyTarget ? kpiMoney / kpiMoneyTarget : 0;
  const ratioLogin = kpiLoginTarget ? kpiLogin / kpiLoginTarget : 0;

  // trend data
  const trendData = useMemo(() => {
    let list = filtered;
    if (trendMetric === "Money Collection") {
      list = list.filter(r => r.Criterion === "Money Collection" && r.Subcategory === trendBucket);
    } else {
      list = list.filter(r => r.Criterion === trendMetric);
    }
    const byDay = groupBy(list, r => r.safeDate);
    return [...byDay.entries()]
      .map(([date, arr]) => ({ date, value: arr.reduce((t, r) => t + toNum(r.Value), 0) }))
      .sort((a,b)=> byStrAsc(a.date, b.date));
  }, [filtered, trendMetric, trendBucket]);

  // agent breakdown (current filter scope)
  const agentBreakdown = useMemo(() => {
    const crit = criterion === "All" ? "Money Collection" : criterion;
    let list = filtered.filter(r => r.Criterion === crit);
    if (crit === "Money Collection" && bucket !== "All") {
      list = list.filter(r => r.Subcategory === bucket);
    }
    const byAgent = groupBy(list, r => r.Employee);
    return [...byAgent.entries()]
      .map(([name, arr]) => ({ agent: name, value: arr.reduce((t, r) => t + toNum(r.Value), 0) }))
      .sort((a,b)=> b.value - a.value);
  }, [filtered, criterion, bucket]);

  // CSV export
  const exportCSV = () => {
    if (!filtered.length) return;
    const header = ["date","Employee","Employee ID","Criterion","Subcategory","Value","uploaded_by","source_upload"];
    const rowsCSV = filtered.map(r => [
      r.safeDate, r.Employee || "", r["Employee ID"] || "", r.Criterion || "",
      r.Subcategory || "", r.Value || "", r.uploaded_by || "", r.source_upload || ""
    ]);
    const csv = [header, ...rowsCSV].map(x => x.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "filtered_stats.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // PDF export
  const exportPDF = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF }   = await import("jspdf");
      const node = captureRef.current;
      if (!node) return;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#fff" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "l", unit: "pt", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      const imgW = w - 40;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.text("Collections Dashboard (Filtered)", 20, 24);
      pdf.addImage(img, "PNG", 20, 40, imgW, Math.min(imgH, h - 60));
      pdf.save("dashboard.pdf");
    } catch (e) {
      console.error(e);
      alert("PDF export failed (see console).");
    }
  };

  const styles = getStyles();

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>Collections Dashboard</div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Filter Mode</div>
          <label style={styles.radio}>
            <input type="radio" checked={mode==="single"} onChange={()=>setMode("single")} />
            <span>Single Day</span>
          </label>
          <label style={styles.radio}>
            <input type="radio" checked={mode==="range"} onChange={()=>setMode("range")} />
            <span>Date Range</span>
          </label>
        </div>

        {mode === "single" ? (
          <div style={styles.section}>
            <div style={styles.label}>Select Date</div>
            <input
              type="date"
              value={singleDate || ""}
              onChange={(e)=>setSingleDate(e.target.value)}
              style={styles.input}
            />
          </div>
        ) : (
          <div style={styles.section}>
            <div style={styles.label}>Start Date</div>
            <input type="date" value={rangeStart||""} onChange={(e)=>setRangeStart(e.target.value)} style={styles.input}/>
            <div style={{height:8}} />
            <div style={styles.label}>End Date</div>
            <input type="date" value={rangeEnd||""} onChange={(e)=>setRangeEnd(e.target.value)} style={styles.input}/>
          </div>
        )}

        <div style={styles.section}>
          <div style={styles.label}>Agent</div>
          <select value={agent} onChange={(e)=>setAgent(e.target.value)} style={styles.select}>
            <option>All</option>
            {agentList.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Criterion</div>
          <select
            value={criterion}
            onChange={(e)=>{ setCriterion(e.target.value); if (e.target.value !== "Money Collection") setBucket("All"); }}
            style={styles.select}
          >
            <option>All</option>
            {criterionList.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {criterion === "Money Collection" && (
          <div style={styles.section}>
            <div style={styles.label}>Bucket</div>
            <select value={bucket} onChange={(e)=>setBucket(e.target.value)} style={styles.select}>
              <option>All</option>
              {["PreDue","Soft","Medium","Hard","RES"].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
        )}

        <div style={styles.section}>
          <button onClick={exportCSV} style={styles.btn}>⬇️ Export CSV</button>
          <button onClick={exportPDF} style={{...styles.btn, marginTop:8}}>🧾 Download PDF</button>
        </div>

        <div style={styles.tip}>Auto-selects the <b>latest date</b> with data.</div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        <div ref={captureRef}>
          <header style={styles.header}>
            <div>
              <h1 style={styles.h1}>Manager Dashboard</h1>
              <div style={styles.subtle}>
                Total rows after filters: <b>{filtered.length}</b>{" "}
                {mode==="single" ? <>• Date: <b>{singleDate||"-"}</b></> : <>• Range: <b>{rangeStart||"-"}</b> → <b>{rangeEnd||"-"}</b></>}
              </div>
            </div>
          </header>

          {/* notifications if below 70% of target */}
          {(ratioCall < 0.7 || ratioMoney < 0.7 || ratioLogin < 0.7) && (
            <div style={{ marginBottom:12, padding:"10px 12px", borderRadius:8, background:"#fff7ed", border:"1px solid #fed7aa", color:"#9a3412" }}>
              ⚠️ Below target:
              {ratioCall < 0.7 && " Calls"}{ratioMoney < 0.7 && " Money"}{ratioLogin < 0.7 && " Login"}
            </div>
          )}

          {/* KPIs */}
          <section style={styles.kpiRow}>
            <Kpi title="Call Count" value={fmt(kpiCall)}  badge={`${Math.round(ratioCall*100)||0}%`}  color={colorForRatio(ratioCall)} />
            <Kpi title="Money Collection" value={fmt(kpiMoney)} badge={`${Math.round(ratioMoney*100)||0}%`} color={colorForRatio(ratioMoney)} />
            <Kpi title="PTP Count" value={fmt(kpiPTP)} />
            <Kpi title="Login Time" value={fmt(kpiLogin)} badge={`${Math.round(ratioLogin*100)||0}%`} color={colorForRatio(ratioLogin)} />
          </section>

          {/* Trend */}
          <section style={{ marginTop: 18 }}>
            <div style={styles.box}>
              <div style={styles.boxHeader}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span>📈</span>
                  <span>
                    Trend — {trendMetric}{trendMetric==="Money Collection" ? ` (${trendBucket})` : ""}
                  </span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <select value={trendMetric} onChange={(e)=>setTrendMetric(e.target.value)} style={styles.selectLight}>
                    <option>Money Collection</option>
                    <option>Call Count</option>
                    <option>PTP Count</option>
                    <option>Login Time</option>
                  </select>
                  {trendMetric === "Money Collection" && (
                    <select value={trendBucket} onChange={(e)=>setTrendBucket(e.target.value)} style={styles.selectLight}>
                      {bucketList.map(b => <option key={b}>{b}</option>)}
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
                      <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          {/* Agent breakdown */}
          <section style={{ marginTop: 18 }}>
            <div style={styles.box}>
              <div style={styles.boxHeader}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span>👥</span>
                  <span>
                    Agent Breakdown — {criterion === "All" ? "Money Collection" : criterion}
                    {criterion === "Money Collection" && bucket !== "All" ? ` (${bucket})` : ""}
                  </span>
                </div>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ height: 320 }}>
                  {agentBreakdown.length === 0 ? (
                    <div style={styles.noData}>No data</div>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={agentBreakdown}>
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

                <div style={{ marginTop: 16, overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr><th style={styles.th}>#</th><th style={styles.th}>Agent</th><th style={styles.th}>Total</th></tr>
                    </thead>
                    <tbody>
                      {agentBreakdown.map((r, i) => (
                        <tr key={r.agent}>
                          <td style={styles.td}>{i + 1}</td>
                          <td style={styles.td}>{r.agent}</td>
                          <td style={styles.td}>{fmt(r.value)}</td>
                        </tr>
                      ))}
                      {agentBreakdown.length === 0 && (
                        <tr><td style={styles.td} colSpan={3}>No rows</td></tr>
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

// --- subcomponents & styles ---
function Kpi({ title, value, badge, color }) {
  return (
    <div style={stylesCard.card}>
      <div style={stylesCard.titleRow}>
        <div style={stylesCard.title}>{title}</div>
        {badge && (
          <span style={{ background: color || "#e5e7eb", color: "#fff", borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
            {badge}
          </span>
        )}
      </div>
      <div style={stylesCard.value}>{value}</div>
    </div>
  );
}
const stylesCard = {
  card: { background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:14, boxShadow:"0 1px 2px rgba(0,0,0,0.04)", minWidth:220 },
  titleRow: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 },
  title: { fontSize:13, fontWeight:700, color:"#6b7280" },
  value: { fontSize:22, fontWeight:900 },
};
function getStyles(){
  return {
    container:{ display:"flex", minHeight:"100vh", background:"#f7f8fa", color:"#0f172a" },
    sidebar:{ width:280, background:"linear-gradient(180deg, #0b1220 0%, #0d1424 100%)", color:"#e5e7eb", borderRight:"1px solid #111827", position:"sticky", top:0, alignSelf:"flex-start", height:"100vh", overflowY:"auto", padding:18 },
    brand:{ fontSize:18, fontWeight:800, marginBottom:12 },
    section:{ marginTop:12 },
    sectionTitle:{ fontSize:12, fontWeight:700, color:"#9aa2b1", textTransform:"uppercase", marginBottom:6 },
    radio:{ display:"flex", alignItems:"center", gap:8, marginTop:6 },
    label:{ fontSize:12, color:"#9aa2b1", marginBottom:6 },
    input:{ width:"100%", padding:"8px 10px", background:"#0f172a", border:"1px solid #1f2937", borderRadius:8, color:"#e5e7eb", outline:"none", WebkitAppearance:"menulist", MozAppearance:"menulist" },
    select:{ width:"100%", padding:"8px 10px", background:"#0f172a", border:"1px solid #1f2937", borderRadius:8, color:"#e5e7eb", outline:"none" },
    btn:{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1px solid #334155", background:"#0f172a", color:"#e5e7eb", cursor:"pointer" },
    tip:{ fontSize:12, color:"#9aa2b1", marginTop:10 },
    main:{ flex:1, padding:22 },
    header:{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14 },
    h1:{ margin:0, fontSize:24, fontWeight:800 },
    subtle:{ color:"#6b7280", marginTop:4, fontSize:13 },
    kpiRow:{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0, 1fr))", gap:14 },
    box:{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 2px rgba(0,0,0,0.04)" },
    boxHeader:{ height:50, padding:"0 14px", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"space-between", fontWeight:800 },
    selectLight:{ padding:"6px 8px", borderRadius:8, border:"1px solid #d1d5db", background:"#fff", color:"#0f172a", outline:"none" },
    noData:{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#6b7280", fontStyle:"italic", border:"1px dashed #e5e7eb", borderRadius:8 },
    table:{ width:"100%", borderCollapse:"collapse", background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, overflow:"hidden" },
    th:{ textAlign:"left", padding:"10px 12px", fontSize:13, color:"#6b7280", borderBottom:"1px solid #e5e7eb" },
    td:{ padding:"10px 12px", borderBottom:"1px solid #f1f5f9", fontSize:14 },
  };
}
