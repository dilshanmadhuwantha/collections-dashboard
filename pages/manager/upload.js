import { useState } from "react";
import * as XLSX from "xlsx";

export default function UploadPage() {
  const [status, setStatus] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("Reading file...");

    // Read Excel into JSON
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    setStatus(`Uploading ${rows.length} rows to Airtable...`);

    // Send rows to API
    const res = await fetch("/api/uploadStats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });

    const json = await res.json();
    if (json.success) {
      setStatus(`✅ Upload complete! Added ${json.inserted} rows.`);
    } else {
      setStatus(`❌ Error: ${json.error}`);
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Manager – Excel Upload</h1>
      <p>Upload a .xlsx or .csv file to update Airtable.</p>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        style={{ marginTop: 20 }}
      />

      <p style={{ marginTop: 20, fontWeight: "bold" }}>{status}</p>
    </div>
  );
}
