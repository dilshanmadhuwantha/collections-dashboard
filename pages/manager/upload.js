import { useEffect, useState } from "react";

export default function UploadHistory() {
  const [logs, setLogs] = useState([]);

  // Load upload logs
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/getUploads");
      const json = await res.json();
      if (json.success) setLogs(json.data);
    }
    load();
  }, []);

  // Undo upload
  const undoUpload = async (uploadId) => {
    if (!confirm("Are you sure you want to undo this upload?")) return;

    const res = await fetch("/api/undoUpload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: uploadId }),
    });

    const json = await res.json();

    if (json.success) {
      alert("Upload undone successfully.");
      location.reload();
    } else {
      alert("Undo failed: " + json.error);
    }
  };

  // Export upload as Excel
  const exportUpload = (uploadId) => {
    window.location.href = "/api/exportUpload?upload_id=" + uploadId;
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Upload History</h1>

      <table
        border="1"
        cellPadding="8"
        style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}
      >
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th>Manager</th>
            <th>Rows</th>
            <th>Upload ID</th>
            <th>Created</th>
            <th>Export</th>
            <th>Undo</th>
          </tr>
        </thead>

        <tbody>
          {logs.map((log, index) => (
            <tr key={index}>
              <td>{log.manager_name}</td>
              <td>{log.row_count}</td>
              <td>{log.upload_id}</td>
              <td>{log.created_at}</td>

              {/* ✅ Export Button */}
              <td>
                <button
                  onClick={() => exportUpload(log.upload_id)}
                  style={{
                    padding: "5px 12px",
                    background: "#0070f3",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Export
                </button>
              </td>

              {/* ✅ Undo Button */}
              <td>
                <button
                  onClick={() => undoUpload(log.upload_id)}
                  style={{
                    padding: "5px 12px",
                    background: "red",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Undo
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
