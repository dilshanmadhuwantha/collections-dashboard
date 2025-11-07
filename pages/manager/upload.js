import { useEffect, useState } from "react";

export default function UploadHistory() {
  const [logs, setLogs] = useState([]);

  async function loadLogs() {
    const res = await fetch("/api/getUploads");
    const json = await res.json();
    if (json.success) {
      setLogs(json.data);
    }
  }

  async function exportUpload(id) {
    window.location.href = `/api/exportUpload?upload_id=${id}`;
  }

  async function undoUpload(id) {
    if (!confirm("Are you sure you want to undo this upload?")) return;

    const res = await fetch("/api/undoUpload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: id }),
    });

    const data = await res.json();
    alert(data.message || data.error);
    loadLogs();
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Upload History</h1>

      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Manager</th>
            <th>Rows</th>
            <th>Upload ID</th>
            <th>Created</th>
            <th>Export</th>
            <th>Undo</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan="6">No uploads found</td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.upload_id}>
                <td>{log.manager_name}</td>
                <td>{log.row_count}</td>
                <td>{log.upload_id}</td>
                <td>{log.created_at}</td>
                <td>
                  <button
                    style={{ background: "dodgerblue", color: "white", padding: "4px 10px", borderRadius: "4px" }}
                    onClick={() => exportUpload(log.upload_id)}
                  >
                    Export
                  </button>
                </td>
                <td>
                  <button
                    style={{ background: "red", color: "white", padding: "4px 10px", borderRadius: "4px" }}
                    onClick={() => undoUpload(log.upload_id)}
                  >
                    Undo
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
