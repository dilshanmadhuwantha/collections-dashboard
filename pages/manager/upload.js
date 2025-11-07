import { useEffect, useState } from "react";

export default function UploadHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doing, setDoing] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/getUploads");
        const json = await res.json();
        if (json.success) setRows(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const undo = async (uploadId) => {
    if (!confirm("Undo this upload? This will delete all rows from that upload.")) return;
    setDoing(uploadId);
    try {
      const res = await fetch("/api/undoUpload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      // refresh list
      const res2 = await fetch("/api/getUploads");
      const json2 = await res2.json();
      if (json2.success) setRows(json2.data);
      alert(`Undo complete. Deleted ${json.deleted} rows.`);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setDoing("");
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <h1>Manager – Upload History</h1>
      {loading ? <p>Loading…</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <Th>Upload ID</Th>
                <Th>Manager</Th>
                <Th>Rows</Th>
                <Th>Created At</Th>
                <Th>Note</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <Td>{r.id}</Td>
                  <Td>{r.manager_name}</Td>
                  <Td>{r.row_count}</Td>
                  <Td>{new Date(r.created_at).toLocaleString()}</Td>
                  <Td>{r.note || "-"}</Td>
                  <Td>
                    <button
                      onClick={() => undo(r.id)}
                      disabled={doing === r.id}
                      style={{ padding: "6px 10px", cursor: "pointer" }}
                    >
                      {doing === r.id ? "Undoing…" : "Undo"}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ marginTop: 14 }}>
        Tip: Use <code>source_upload_id</code> on the Stats table to trace any row back to its upload.
      </p>
    </div>
  );
}

function Th({ children }) {
  return <th style={{ border: "1px solid #ddd", background: "#f6f6f6", padding: 8, textAlign: "left" }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ border: "1px solid #ddd", padding: 8 }}>{children}</td>;
}
