import { useState } from "react";
import * as XLSX from "xlsx";

export default function UploadPage() {
  const [status, setStatus] = useState(""); // "idle" | "reading" | "uploading" | "success" | "error"
  const [message, setMessage] = useState("");
  const [disabled, setDisabled] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setDisabled(true);
      setStatus("reading");
      setMessage("Reading file...");

      // Read Excel into JSON
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

      setStatus("uploading");
      setMessage(`Uploading ${rows.length} row${rows.length > 1 ? "s" : ""} to Airtable...`);

      // Send rows to API
      const res = await fetch("/api/uploadStats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      const json = await res.json();

      if (json.success) {
        setStatus("success");
        setMessage(`Upload complete! Added ${json.inserted} row${json.inserted > 1 ? "s" : ""}.`);
        // auto-hide success after 5s but keep disabled false so user can upload again
        setTimeout(() => {
          setStatus("");
          setMessage("");
        }, 5000);
      } else {
        setStatus("error");
        setMessage(`Error: ${json.error || "Unknown server error"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      setMessage(`Error: ${err.message}`);
    } finally {
      setDisabled(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Manager – Excel Upload</h1>
      <p style={styles.p}>Upload a <strong>.xlsx</strong> or <strong>.csv</strong> file to update Airtable.</p>

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

        {status === "uploading" && (
          <div style={styles.statusRow}>
            <div style={styles.spinner} aria-hidden="true" />
            <div style={styles.statusText}>{message}</div>
          </div>
        )}

        {status === "reading" && (
          <div style={styles.statusRow}>
            <div style={styles.spinner} aria-hidden="true" />
            <div style={styles.statusText}>{message}</div>
          </div>
        )}

        {status === "success" && (
          <div role="status" style={styles.success}>
            <span style={styles.successIcon}>✅</span>
            <span style={{ marginLeft: 8 }}>{message}</span>
          </div>
        )}

        {status === "error" && (
          <div role="alert" style={styles.error}>
            <span style={styles.errorIcon}>❌</span>
            <span style={{ marginLeft: 8 }}>{message}</span>
          </div>
        )}

        {/* show last message if in idle but message exists */}
        {!status && message && (
          <div style={styles.info}>
            <span>{message}</span>
          </div>
        )}
      </div>

      <p style={styles.note}>Tip: Headers must match — Employee, Employee ID, Criterion, Subcategory, Value</p>
    </div>
  );
}

const styles = {
  page: {
    padding: "40px",
    fontFamily: "sans-serif",
    maxWidth: 820,
    margin: "0 auto",
  },
  h1: { fontSize: 36, margin: "0 0 8px 0" },
  p: { margin: "0 0 20px 0", color: "#333" },
  uploader: { marginTop: 12 },
  chooseLabel: {
    display: "inline-block",
    background: "#fff",
    border: "1px solid #ccc",
    padding: "8px 10px",
    cursor: "pointer",
    borderRadius: 6,
  },
  fileInput: { cursor: "pointer" },
  statusRow: {
    display: "flex",
    alignItems: "center",
    marginTop: 16,
  },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "3px solid rgba(0,0,0,0.12)",
    borderTopColor: "#0b84ff",
    animation: "spin 1s linear infinite",
  },
  statusText: { marginLeft: 10, fontWeight: 600 },
  success: {
    marginTop: 16,
    display: "inline-flex",
    alignItems: "center",
    background: "#e6ffed",
    border: "1px solid #b6f0c9",
    padding: "10px 12px",
    borderRadius: 6,
    color: "#084d22",
    fontWeight: 700,
  },
  successIcon: { fontSize: 18 },
  error: {
    marginTop: 16,
    display: "inline-flex",
    alignItems: "center",
    background: "#ffebeb",
    border: "1px solid #ffbcbc",
    padding: "10px 12px",
    borderRadius: 6,
    color: "#8b1b1b",
    fontWeight: 700,
  },
  errorIcon: { fontSize: 18 },
  info: { marginTop: 16, color: "#333" },
  note: { marginTop: 20, color: "#666" },
};

/* Add keyframe style for spinner: we need to append global style.
   Next.js will support <style jsx global> but since this is a single-file replacement
   we keep a tiny global injection below by appending to document head when component loads.
*/

// inject spinner keyframe (runs only in browser)
if (typeof window !== "undefined") {
  const id = "upload-page-spinner-style";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }
}
