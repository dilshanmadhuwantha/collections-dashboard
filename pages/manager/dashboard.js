import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

export default function ManagerDashboard() {
  const [rows, setRows] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [filterMode, setFilterMode] = useState("single");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const res = await fetch("/api/getAllStats");
    const json = await res.json();
    if (json.success) {
      setRows(json.data);
    }
  }

  // Extract newest date for auto-select
  useEffect(() => {
    if (rows.length > 0) {
      const newest = rows.reduce((a, b) =>
        new Date(a.created_at) > new Date(b.created_at) ? a : b
      );
      setSelectedDate(newest.date);
    }
  }, [rows]);

  const filteredRows = rows.filter(r => r.date === selectedDate);

  const totalCall = filteredRows
    .filter(r => r.Criterion === "Call Count")
    .reduce((a, b) => a + Number(b.Value), 0);

  const totalMoney = filteredRows
    .filter(r => r.Criterion === "Money Collection")
    .reduce((a, b) => a + Number(b.Value), 0);

  const totalPTP = filteredRows
    .filter(r => r.Criterion === "PTP Count")
    .reduce((a, b) => a + Number(b.Value), 0);

  const totalLogin = filteredRows
    .filter(r => r.Criterion === "Login Time")
    .reduce((a, b) => a + Number(b.Value), 0);


  return (
    <div style={styles.container}>
      
      {/* ✅ LEFT SIDEBAR */}
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Collections Dashboard</h2>

        <p style={styles.label}>FILTER MODE</p>
        <label style={styles.radioRow}>
          <input
            type="radio"
            checked={filterMode === "single"}
            onChange={() => setFilterMode("single")}
          />
          Single Day
        </label>

        <p style={{ marginTop: 20 }}>Select Date</p>
        <input
          type="date"
          value={selectedDate || ""}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={styles.dateInput}
        />
      </div>

      {/* ✅ MAIN CONTENT */}
      <div style={styles.main}>
        <h1>Manager Dashboard</h1>
        <p>Total rows after filters: {filteredRows.length}</p>

        {/* ✅ KPIs */}
        <div style={styles.kpiRow}>
          <div style={styles.kpiBox}>
            <h4>Call Count</h4>
            <p>{totalCall}</p>
          </div>

          <div style={styles.kpiBox}>
            <h4>Money Collection</h4>
            <p>{totalMoney.toLocaleString()}</p>
          </div>

          <div style={styles.kpiBox}>
            <h4>PTP Count</h4>
            <p>{totalPTP}</p>
          </div>

          <div style={styles.kpiBox}>
            <h4>Login Time</h4>
            <p>{totalLogin}</p>
          </div>
        </div>

        {/* ✅ Trend Chart */}
        <h3 style={{ marginTop: 40 }}>Trend — Money Collection</h3>
        <div style={styles.chartBox}>
          <ResponsiveContainer>
            <LineChart
              data={[{ date: selectedDate, value: totalMoney }]}
            >
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#FF6600" />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },

  sidebar: {
    width: 260,
    background: "#0c1222",
    color: "white",
    padding: 20,
    overflowY: "auto",
  },

  main: {
    flex: 1,
    padding: 30,
    overflowY: "auto",
    background: "#f7f9fc",
  },

  sidebarTitle: {
    fontSize: 20,
    marginBottom: 20,
  },

  label: {
    fontSize: 12,
    marginTop: 20,
  },

  radioRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  dateInput: {
    width: "100%",
    padding: 10,
    borderRadius: 6,
    border: "1px solid #999",
    marginTop: 5,
  },

  kpiRow: {
    display: "flex",
    gap: 20,
  },

  kpiBox: {
    flex: 1,
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },

  chartBox: {
    height: 320,
    background: "white",
    borderRadius: 10,
    padding: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
};
