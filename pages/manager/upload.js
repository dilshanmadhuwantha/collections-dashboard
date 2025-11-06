import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function UploadPage() {
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [managerName, setManagerName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("managerName");
    if (saved) setManagerName(saved);
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!managerName) {
      alert("Please enter your name before uploading.");
      e.target.value = "";
      return;
    }

    try {
      setDisabled(true);
      setStatus("reading");
      setMessage("Reading file...");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        setStatus("error");
        setMessage("No rows found in file.");
        setDisabled(false);
        return;
      }

      localStorage.setItem("managerName", managerName);

      setStatus("uploading");
      setMessage(`Uploading ${rows.length} row${rows.length > 1 ? "s" : ""}...`);

      const res = await fetch("/api/uploadStats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, managerName }),
      });

      const json = await res.json();

      if (json.success) {
        setStatus("success");
        setMessage(`Upload complete! Added ${json.inserted} row${json.inserted > 1 ? "s" : ""}.`);

        setTimeout(() => {
          setStatus("");
          setMessage("");
        }, 5000);
      } else {
        setStatus("error");
        setMessage(`Error: ${json.error}`);
      }
    } catch (err) {
      setStatus("error");
      setMessage(`Error: ${err.message}`);
    } finally {
      setDisabled(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Manager – Excel Upload</h1>
      <p style={styles.p}>
        Upload a <strong>.xlsx</strong> or <strong>.csv</strong> file to update Airtable.
      </p>

      <div style={{ marginBottom: 15 }}>
        <label>
          <strong>Manager Name:</strong>{" "}
          <input
            type="text"
            placeholder="Enter your name"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            style={styles.nameInput}
          />
        </label>
      </div>

      <div style={styles.uploader}>
        <label style={styles.chooseLabel}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            disabled={disabled}
            style={styles.fileInput}
          />
        </label>

        {status === "reading" && (
          <div style={styles.statusRow}>
            <div style={styles.spinner} />
            <span style={styles.statusText}>{message}</span>
          </div>
        )}

        {status === "uploading" && (
          <div style={styles.statusRow}>
            <div style={styles.spinner} />
            <span style={styles.statusText}>{message}</span>
          </div>
        )}

        {status === "success" && (
          <div style={styles.success}>
            <span style={styles.successIcon}>✅</span>
            <span style={{ marginLeft: 8 }}>{message}</span>
          </div>
        )}

        {status === "error" && (
          <div style={styles.error}>
            <span style={styles.errorIcon}>❌</span>
            <span style={{ marginLeft: 8 }}>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ✅ CSS Styles */
const styles = {
  page: { padding: 40, fontFamily: "sans-serif" },
  h1: { marginBottom: 10 },
  p: { marginBottom: 20 },
  nameInput: {
    padding: 6,
    fontSize: 14,
    marginLeft: 10,
    border: "1px solid #ccc",
  },
  uploader: {
    display: "flex",
    alignItems: "center",
    gap: 15,
  },
  chooseLabel: {
    border: "1px solid #ccc",
    padding: "8px 14px",
    borderRadius: 4,
    cursor: "pointer",
    background: "#f9f9f9",
  },
  fileInput: {
    cursor: "pointer",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  statusText: {
    fontSize: 14,
  },
  spinner: {
    width: 16,
    height: 16,
    border: "3px solid #ddd",
    borderTop: "3px solid #555",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  success: {
    background: "#e8f9e8",
    border: "1px solid #6dc46d",
    padding: "8px 12px",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
  },
  successIcon: {
    fontSize: 18,
  },
  error: {
    background: "#fdeaea",
    border: "1px solid #e27a7a",
    padding: "8px 12px",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
  },
  errorIcon: {
    fontSize: 18,
  },
};
