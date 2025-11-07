// pages/manager/uploads.js
import { useEffect, useState } from "react";

export default function UploadHistory() {
  const [data, setData] = useState([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/getUploads");
    const json = await res.json();
    if (json.success) setData(json.data);
  }

  async function undoUpload(upload) {
    if (!confirm("Are you sure you want to undo this upload?")) return;

    setBusy(upload.upload_id);

    const res = await fetch("/api/undoUpload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: upload.upload_id })
    });

    const json = await res.json();

    if (json.success) {
      alert(`✅ Undo complete — deleted ${json.deleted} rows`);
      load();
    } else {
      alert("❌ Undo failed: " + json.error);
    }

    setBusy(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>Upload History</h1>

      <table
        border="1"
        cellPadding="8"
        style={{ borderCollapse: "collapse", width: "100%", marginTop: 20 }}
      >
        <thead>
          <tr>
            <th>Manager</th>
            <th>Rows</th>
            <th>Upload ID</th>
            <th>Created</th>
            <th>Undo</th>
          </tr>
        </thead>

        <tbody>
          {data.map((u) => (
            <tr key={u.upload_id}>
              <td>{u.manager_name}</td>
              <td>{u.row_count}</td>
              <td>{u.upload_id}</td>
              <td>{u.created_at}</td>
              <td>
                <button
                  disabled={busy === u.upload_id}
                  onClick={() => undoUpload(u)}
                >
                  {busy === u.upload_id ? "Undoing…" : "Undo"}
                </button>
              </td>
            </tr>
          ))}

          {data.length === 0 && (
            <tr>
              <td colSpan="5">No uploads yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
