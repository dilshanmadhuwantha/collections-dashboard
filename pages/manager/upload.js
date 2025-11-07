import { useEffect, useState } from "react";

export default function Uploads() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState("");

  const refresh = async () => {
    try {
      const res = await fetch("/api/getUploads");
      const json = await res.json();
      if (json.success) setRows(json.data);
      else setRows([]);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => { refresh(); }, []);

  const undo = async (id) => {
    if (!confirm("Undo this upload?")) return;
    setBusy(id);
    try {
      const res = await fetch("/api/undoUpload", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ uploadId: id })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Undo failed");
      alert(`Deleted ${json.deleted} rows`);
      await refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div style={{ padding:24, fontFamily:"sans-serif" }}>
      <h1>Upload History</h1>
      <p style={{ color:"#6b7280" }}>If you haven’t wired the APIs, this list will be empty. It won’t break.</p>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%" }}>
          <thead><tr><Th>ID</Th><Th>Manager</Th><Th>Rows</Th><Th>Created</Th><Th>Note</Th><Th>Action</Th></tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <Td>{r.id}</Td>
                <Td>{r.manager_name}</Td>
                <Td>{r.row_count}</Td>
                <Td>{new Date(r.created_at).toLocaleString()}</Td>
                <Td>{r.note||"-"}</Td>
                <Td><button disabled={busy===r.id} onClick={()=>undo(r.id)}>{busy===r.id?"Undoing…":"Undo"}</button></Td>
              </tr>
            ))}
            {rows.length===0 && <tr><Td colSpan={6}>No uploads</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Th({children}){return <th style={{textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb", color:"#6b7280"}}>{children}</th>}
function Td({children, ...p}){return <td {...p} style={{padding:8, borderBottom:"1px solid #f1f5f9"}}>{children}</td>}
