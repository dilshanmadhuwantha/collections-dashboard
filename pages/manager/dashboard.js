// Full dashboard.js with PDF export integrated

import { useEffect, useMemo, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";
import * as XLSX from "xlsx";

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);

  const [mode, setMode] = useState("single");
  const [singleDate, setSingleDate] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(new Date());
  const [rangeEnd, setRangeEnd] = useState(new Date());
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("All");
  const [criterion, setCriterion] = useState("All");
  const [subcategory, setSubcategory] = useState("All");
  const MONEY_BUCKETS = ["PreDue", "Soft", "Medium", "Hard", "RES"];

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

  const exportPDF = async () => {
    if (!reportRef.current) return;
    const node = reportRef.current;

    const canvas = await html2canvas(node, { scale: 2, useCORS: true });
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

    pdf.save("report.pdf");
  };

  return (
    <div style={{ display: "flex", fontFamily: "Arial" }}>
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
          <input type="radio" checked={mode === "single"} onChange={() => setMode("single")} />
          Single Day
          <br />
          <input type="radio" checked={mode === "range"} onChange={() => setMode("range")} />
          Date Range
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
          <button
            onClick={exportExcel}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #aaa",
              borderRadius: 6,
              cursor: "pointer",
              background: "#fff",
            }}
          >
            📥 Export to Excel
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            onClick={exportPDF}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #aaa",
              borderRadius: 6,
              cursor: "pointer",
              background: "#fff",
            }}
          >
            🧾 Download PDF Report
          </button>
        </div>
      </div>

      <div ref={reportRef} style={{ marginLeft: 300, padding: 20, width: "100%" }}>
        <h1>Manager Dashboard</h1>
        <p>Total rows after filters: {filteredRows.length}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
            marginTop: 10,
          }}
        >
          <RankingCard title="🏆 Call Count" items={rankings.call} field="call" />
          <RankingCard title="💰 Money Collection" items={rankings.money} field="money" />
          <RankingCard title="🤝 PTP Count" items={rankings.ptp} field="ptp" />
          <RankingCard title="⏱️ Login Time" items={rankings.login} field="login" />
        </div>
      </div>
    </div>
  );
}

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
      {items &&
        items.map((x, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span>
              {i + 1}. {x.agent}
            </span>
            <span style={{ fontWeight: 700 }}>{formatNumber(x[field])}</span>
          </div>
        ))}
    </div>
  );
}

function formatNumber(n) {
  if (n === undefined || n === null || isNaN(n)) return "0";
  return new Intl.NumberFormat().format(Number(n));
}
