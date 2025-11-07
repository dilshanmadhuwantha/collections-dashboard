// pages/manager/upload.js
import { useState } from "react";
import * as XLSX from "xlsx";

export default function ManagerUpload() {
  const [file, setFile] = useState(null);
  const [manager, setManager] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ Convert Excel file → JSON rows
  async function readExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        resolve(rows);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // ✅ Upload handler
  const handleUpload = async () => {
    if (!manager) return alert("Enter manager name");
    if (!file) return alert("Select Excel file");

    setMsg("⏳ Reading Excel...");

    // ✅ Convert Excel → rows
    const rows = await readExcel(file);

    if (!rows.length) {
      setMsg("❌ Upload failed: Excel has no rows");
      return;
    }

    setMsg("⏳ Uploading to server...");

    const res = await fetch("/api/uploadStats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, managerName: manager }),
    });

    const json = await res.json();

    if (json.success) {
      setMsg(`✅ Uploaded ${json.inserted} rows`);
    } else {
      setMsg(`❌ Upload failed: ${json.error}`);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Manager Excel Upload</h1>

      <label>Manager Name</label><br />
      <input
        type="text"
        value={manager}
        onChange={(e) => setManager(e.target.value)}
        style={{ padding: 8, marginBottom: 20, width: 250 }}
      /><br />

      <label>Upload Excel File</label><br />
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files[0])}
        style={{ marginBottom: 20 }}
      /><br />

      <button
        onClick={handleUpload}
        style={{ padding: "10px 18px", background: "green", color: "white" }}
      >
        Upload
      </button>

      <p style={{ marginTop: 20 }}>{msg}</p>
    </div>
  );
}
