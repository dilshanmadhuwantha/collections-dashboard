import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);

  // ✅ FILTER STATES
  const [mode, setMode] = useState("single"); // single | range
  const [singleDate, setSingleDate] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(new Date());
  const [rangeEnd, setRangeEnd] = useState(new Date());

  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("All");

  const [criterion, setCriterion] = useState("All");
  const [subcategory, setSubcategory] = useState("All");

  const MONEY_BUCKETS = ["PreDue", "Soft", "Medium", "Hard", "RES"];

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) {
        setRows(json.data);

        // ✅ Extract unique agent names
        const uniqueAgents = [...new Set(json.data.map((r) => r.Employee))];
        setAgents(uniqueAgents);
      }
    }
    load();
  }, []);

  // ✅ Format Airtable date
  const getDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d.toISOString().split("T")[0];
  };

  // ✅ Apply all filters
  const filteredRows = rows.filter((row) => {
    const rowDate = getDate(row.created_at);
    if (!rowDate) return false;

    // ✅ Date Filter
    const rowD = new Date(rowDate);
    if (mode === "single") {
      const sel = new Date(singleDate.toISOString().split("T")[0]);
      if (rowD.getTime() !== sel.getTime()) return false;
    } else {
      const start = new Date(rangeStart.toISOString().split("T")[0]);
      const end = new Date(rangeEnd.toISOString().split("T")[0]);
      if (rowD < start || rowD > end) return false;
    }

    // ✅ Agent Filter
    if (selectedAgent !== "All" && row.Employee !== selectedAgent) return false;

    // ✅ Criterion Filter
    if (criterion !== "All" && row.Criterion !== criterion) return false;

    // ✅ Subcategory Filter (ONLY for Money Collection)
    if (criterion === "Money Collection" && subcategory !== "All") {
      if (row.Subcategory !== subcategory) return false;
    }

    return true;
  });

  // ✅ Group filtered rows into chart blocks
  const grouped = {};

  filteredRows.forEach((row) => {
    const dateKey = getDate(row.created_at);
    if (!dateKey) return;

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        "Call Count": {},
        "Money Collection": {
          PreDue: {},
          Soft: {},
          Medium: {},
          Hard: {},
          RES: {},
        },
        "PTP Count": {},
        "Login Time": {},
      };
    }

    const val = Number(row.Value || 0);
    const agent = row.Employee;

    if (row.Criterion === "Call Count") {
      grouped[dateKey]["Call Count"][agent] =
        (grouped[dateKey]["Call Count"][agent] || 0) + val;
    }

    if (row.Criterion === "Money Collection") {
      const b = row.Subcategory || "Soft";
      if (grouped[dateKey]["Money Collection"][b]) {
        grouped[dateKey]["Money Collection"][b][agent] =
          (grouped[dateKey]["Money Collection"][b][agent] || 0) + val;
      }
    }

    if (row.Criterion === "PTP Count") {
      grouped[dateKey]["PTP Count"][agent] =
        (grouped[dateKey]["PTP Count"][agent] || 0) + val;
    }

    if (row.Criterion === "Login Time") {
      grouped[dateKey]["Login Time"][agent] =
        (grouped[dateKey]["Login Time"][agent] || 0) + val;
    }
  });

  const toChart = (obj) =>
    Object.entries(obj).map(([agent, value]) => ({
      agent,
      value,
    }));

  return (
    <div style={{ display: "flex", fontFamily: "Arial" }}>
      {/* ✅ SIDEBAR */}
      <div
        style={{
          width: 260,
          padding: 20,
          borderRight: "2px solid #ddd",
          height: "100vh",
          background: "#fafafa",
          position: "fixed",
        }}
      >
        <h2>Filters</h2>

        {/* ✅ FILTER MODE */}
        <label style={{ fontWeight: "bold" }}>Filter Mode</label>
        <div>
          <input
            type="radio"
            checked={mode === "single"}
            onChange={() => setMode("single")}
          />{" "}
          Single Day
          <br />
          <input
            type="radio"
            checked={mode === "range"}
            onChange={() => setMode("range")}
          />{" "}
          Date Range
        </div>

        {/* ✅ DATE PICKERS */}
        {mode === "single" ? (
          <div style={{ marginTop: 15 }}>
            <label style={{ fontWeight: "bold" }}>Select Date</label>
            <DatePicker
              selected={singleDate}
              onChange={(d) => setSingleDate(d)}
              dateFormat="yyyy-MM-dd"
              className="date-input"
            />
          </div>
        ) : (
          <div style={{ marginTop: 15 }}>
            <label style={{ fontWeight: "bold" }}>From</label>
            <DatePicker
              selected={rangeStart}
              onChange={(d) => setRangeStart(d)}
              dateFormat="yyyy-MM-dd"
            />
            <br />
            <label style={{ fontWeight: "bold" }}>To</label>
            <DatePicker
              selected={rangeEnd}
              onChange={(d) => setRangeEnd(d)}
              dateFormat="yyyy-MM-dd"
            />
          </div>
        )}

        {/* ✅ AGENT SELECT */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontWeight: "bold" }}>Agent</label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="All">All</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ CRITERION SELECT */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontWeight: "bold" }}>Criterion</label>
          <select
            value={criterion}
            onChange={(e) => setCriterion(e.target.value)}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="All">All</option>
            <option value="Call Count">Call Count</option>
            <option value="Money Collection">Money Collection</option>
            <option value="PTP Count">PTP Count</option>
            <option value="Login Time">Login Time</option>
          </select>
        </div>

        {/* ✅ SUBCATEGORY SELECT ONLY IF MONEY COLLECTION */}
        {criterion === "Money Collection" && (
          <div style={{ marginTop: 20 }}>
            <label style={{ fontWeight: "bold" }}>Subcategory</label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              style={{ width: "100%", padding: 6 }}
            >
              <option value="All">All</option>
              {MONEY_BUCKETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ✅ MAIN CONTENT */}
      <div style={{ marginLeft: 300, padding: 20, width: "100%" }}>
        <h1>Manager Dashboard</h1>
        <p>Total rows after filters: {filteredRows.length}</p>

        {Object.entries(grouped).map(([date, data]) => (
          <div key={date} style={{ marginTop: 50 }}>
            <h2>📅 {date}</h2>

            {/* ✅ 1️⃣ CALL COUNT */}
            <h3>Call Count</h3>
            <Chart data={toChart(data["Call Count"])} color="#007bff" />

            {/* ✅ 2️⃣ MONEY COLLECTION */}
            <h3>Money Collection</h3>
            {MONEY_BUCKETS.map((b) => (
              <div key={b}>
                <h4>{b}</h4>
                <Chart data={toChart(data["Money Collection"][b])} color="#C70039" />
              </div>
            ))}

            {/* ✅ 3️⃣ PTP COUNT */}
            <h3>PTP Count</h3>
            <Chart data={toChart(data["PTP Count"])} color="#FF8C00" />

            {/* ✅ 4️⃣ LOGIN TIME */}
            <h3>Login Time</h3>
            <Chart data={toChart(data["Login Time"])} color="#17A589" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ✅ REUSABLE CHART BLOCK */
function Chart({ data, color }) {
  if (!data || data.length === 0)
    return <p style={{ color: "gray" }}>No data</p>;

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
