import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function UploadPage() {
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [managerName, setManagerName] = useState("");

  // ✅ Load saved manager name
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

      // Save manager name locally
      localStorage.setItem("managerName", managerName);

      setStatus("uploading");
      setMessage(`Uploading ${rows.length} row${rows.length > 1 ? "s" : ""} to Airtable...`);

      // Send rows + managerName to API
      const res = await fetch("/api/uploadStats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, managerName }),
      });

      const json = await res.json();

      if (json.success) {
        setStatus("success");
        setMessage(`Upload complete! Added ${json.inserted} row${json.inserted > 1 ? "s" : ""}.`);

        // Auto-hide after 5 seconds
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
      <p style={styles.p}>
        Upload a <strong>.xlsx</strong> or <strong>.csv</strong> file to update Airtable.
      </p>

      {/* ✅ Manager name input */}
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

        {status === "upload
