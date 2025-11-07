import { useEffect, useMemo, useState } from "react";
import { moneyTargetForAgentOverDays, colorForRatio } from "../../lib/targets";

export default function Monthly() {
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0,7)); // yyyy-mm

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/getAllStats");
      const json = await res.json();
      if (json.success) {
        setRows(json.data.map(r => ({...r, safeDate: String(r.date || r.created_at || "").slice(0,10)})));
      }
    })();
  }, []);

  // all days in selected month
  const monthDays = useMemo(() => {
    const [y,m] = month.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    return Array.from({length:dim}, (_,i)=>`${month}-${String(i+1).padStart(2,"0")}`);
  }, [month]);

  const inMonth = useMemo(() => rows.filter(r => (r.safeDate||"").startsWith(month)), [rows, month]);

  const moneyByAgent = useMemo(() => {
    const map = new Map();
    inMonth.filter(r => r.Criterion === "Money Collection").forEach(r=>{
      map.set(r.Employee, (map.get(r.Employee)||0)+Number(r.Value||0));
    });
    return map;
  }, [inMonth]);

  const table = Array.from(moneyByAgent.entries())
    .map(([agent, value]) => {
      const target = Math.round(moneyTargetForAgentOverDays(agent, monthDays));
      const ratio = target ? value/target : 0;
      return { agent, value, target, ratio };
    })
    .sort((a,b)=> b.value - a.value);

  const totalMoney  = table.reduce((t,x)=>t+x.value,0);
  const totalTarget = table.reduce((t,x)=>t+x.target,0);
  const ratioTotal  = totalTarget ? totalMoney/totalTarget : 0;

  return (
    <div style={{ padding:24, fontFamily:"sans-serif" }}>
      <h1>Monthly Summary</h1>

      <div style={{ margin:"12px 0" }}>
        <label>Month: </label>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/>
      </div>

      <div style={{ margin:"10px 0", padding:"10px 12px", background:"#f8fafc", border:"1px solid #e5e7eb", borderRadius:8 }}>
        <b>Total Money:</b> {totalMoney.toLocaleString()} &nbsp;|&nbsp;
        <b>Target:</b> {totalTarget.toLocaleString()} &nbsp;|&nbsp;
        <b>Progress:</b> <span style={{ color: colorForRatio(ratioTotal) }}>{Math.round(ratioTotal*100)||0}%</span>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%" }}>
          <thead>
            <tr><Th>#</Th><Th>Agent</Th><Th>Collected</Th><Th>Target</Th><Th>Progress</Th></tr>
          </thead>
          <tbody>
            {table.map((r,i)=>(
              <tr key={r.agent}>
                <Td>{i+1}</Td>
                <Td>{r.agent}</Td>
                <Td>{r.value.toLocaleString()}</Td>
                <Td>{r.target.toLocaleString()}</Td>
                <Td><span style={{ color: colorForRatio(r.ratio) }}>{Math.round(r.ratio*100)||0}%</span></Td>
              </tr>
            ))}
            {table.length===0 && <tr><Td colSpan={5}>No data</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Th({children}){return <th style={{textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb", color:"#6b7280"}}>{children}</th>}
function Td({children, ...p}){return <td {...p} style={{padding:8, borderBottom:"1px solid #f1f5f9"}}>{children}</td>}
