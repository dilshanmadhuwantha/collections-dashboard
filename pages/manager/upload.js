import { useEffect, useState } from "react";

export default function UploadHistory() {
  const [data, setData] = useState([]);

  async function load() {
    const res = await fetch("/api/getUploads");
    const json = await res.json();
    if (json.success) setData(json.data);
  }

  async function undo(upload) {
    if (!confirm("Undo this upload?")) return;

    const ids = upload.stats_record_ids.split(",");

    const res = await fetch("/api/undoUpload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record_ids: ids,
        upload_id: upload.id,
      }),
    });

    const json = await res.json();
    if (json.success) alert("✅ Undo completed");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1>Upload History</h1>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
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
            <tr key={u.id}>
              <td>{u.manager_name}</td>
              <td>{u.row_count}</td>
              <td>{u.upload_id}</td>
              <td>{u.created_at}</td>
              <td>
                <button onClick={() => undo(u)}>Undo</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
