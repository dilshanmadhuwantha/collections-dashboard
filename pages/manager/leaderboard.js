import { useEffect, useMemo, useState } from "react";

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState("single");
  const [singleDate, setSingleDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [metric, setMetric] = useState("Money Collection");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) {
        const data = json.data.map(r => ({...r, safeDate: String(r.date || r.created_at || "").slice(0,10)}));
        setRows(data);
        const newest = data.map(d=>d.safeDate).filter(Boolean).sort().reverse()[0] || "";
        setSingleDate(newest);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let f = rows.filter(r => r.Criterion === metric);
    if (mode === "single" && singleDate) f = f.filter(r => r.safeDate === singleDate);
    if (mode === "range" && start && end) f = f.filter(r => r.safeDate >= start && r.safeDate <= end);
    return f;
  }, [rows, metric, mode, singleDate, start, end]);

  const table = useMemo(() => {
    const m = new Map();
    filtered.forEach(r => m.set(r.Employee, (m.get(r.Employee)||0)+Number(r.Value||0)));
    return Array.from(m.entries())
      .map(([agent, value])=>({agent, value}))
      .sort((a,b)=>b.value-a.value);
  }, [filtered]);

  return (
    <div style={{ padding:24, fontFamily:"sans-serif" }}>
      <h1>Leaderboard</h1>

      <div style={{ display:"flex", gap:12, flexWrap:"wrap", margin:"12px 0" }}>
        <select value={mode} onChange={e=>setMode(e.target.value)}>
          <option value="single">Single Day</option>
          <option value="range">Date Range</option>
        </select>
        <select value={metric} onChange={e=>setMetric(e.target.value)}>
          <option>Money Collection</option>
          <option>Call Count</option>
          <option>PTP Count</option>
          <option>Login Time</option>
        </select>
        {mode==="single" ? (
          <input type="date" value={singleDate} onChange={e=>setSingleDate(e.target.value)} />
        ) : (
          <>
            <input type="date" value={start} onChange={e=>setStart(e.target.value)} />
            <input type="date" value={end} onChange={e=>setEnd(e.target.value)} />
          </>
        )}
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%" }}>
          <thead><tr><Th>#</Th><Th>Agent</Th><Th>{metric}</Th></tr></thead>
          <tbody>
            {table.map((r,i)=>(
              <tr key={r.agent}><Td>{i+1}</Td><Td>{r.agent}</Td><Td>{r.value.toLocaleString()}</Td></tr>
            ))}
            {table.length===0 && <tr><Td colSpan={3}>No data</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Th({children}){return <th style={{textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb", color:"#6b7280"}}>{children}</th>}
function Td({children, ...p}){return <td {...p} style={{padding:8, borderBottom:"1px solid #f1f5f9"}}>{children}</td>}
