import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

export default function AgentPage() {
  const router = useRouter();
  const { empId } = router.query;
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!empId) return;
    (async () => {
      const res = await fetch(`/api/getAgentStats?empId=${empId}`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data.map(r => ({...r, safeDate: String(r.date || r.created_at || "").slice(0,10)})));
      }
    })();
  }, [empId]);

  const totals = useMemo(()=>{
    const sum = (c) => rows.filter(r=>r.Criterion===c).reduce((t,r)=>t+Number(r.Value||0),0);
    return { calls: sum("Call Count"), money: sum("Money Collection"), ptp: sum("PTP Count"), login: sum("Login Time") };
  },[rows]);

  return (
    <div style={{ padding:24, fontFamily:"sans-serif" }}>
      <h1>Agent Dashboard — {empId}</h1>
      <div style={{ display:"flex", gap:14 }}>
        <Card title="Call Count" value={totals.calls}/>
        <Card title="Money Collection" value={totals.money.toLocaleString()}/>
        <Card title="PTP Count" value={totals.ptp}/>
        <Card title="Login Time" value={totals.login}/>
      </div>

      <h3 style={{ marginTop:24 }}>Recent Rows</h3>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%" }}>
          <thead><tr><Th>Date</Th><Th>Criterion</Th><Th>Bucket</Th><Th>Value</Th></tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}><Td>{r.safeDate}</Td><Td>{r.Criterion}</Td><Td>{r.Subcategory||"-"}</Td><Td>{r.Value}</Td></tr>
            ))}
            {rows.length===0 && <tr><Td colSpan={4}>No data</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Card({ title, value }) { return (
  <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:14, minWidth:220 }}>
    <div style={{ color:"#6b7280", fontWeight:700 }}>{title}</div>
    <div style={{ fontSize:22, fontWeight:900 }}>{value}</div>
  </div>
);}
function Th({children}){return <th style={{textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb", color:"#6b7280"}}>{children}</th>}
function Td({children, ...p}){return <td {...p} style={{padding:8, borderBottom:"1px solid #f1f5f9"}}>{children}</td>}
