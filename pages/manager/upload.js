import { useState } from "react";
import * as XLSX from "xlsx";

export default function ManagerUploadPage() {
  const [excelRows, setExcelRows] = useState([]);
  const [managerName, setManagerName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);

      setExcelRows(json);
    };

    reader.readAsArrayBuffer(file);
  };

  const submitUpload = async () => {
    if (!managerName) {
      setMessage("Enter manager name");
      return;
    }
    if (excelRows.length === 0) {
      setMessage("Upload an Excel file first");
      return;
    }

    setUploading(true);

    const res = await fetch("/api/uploadStats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerName,
        rows: excelRows,
      }),
    });

    const json = await res.json();

    if (json.success) {
      setMessage(`✅ Uploaded ${json.inserted} rows`);
      setExcelRows([]);
    } else {
      setMessage("❌ Upload failed: " + json.error);
    }

    setUploading(false);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Manager Excel Upload</h1>

      <label>Manager Name</label>
      <input
        type="text"
        value={managerName}
        onChange={(e) => setManagerName(e.target.value)}
        style={{ padding: 8, display: "block", marginBottom: 20 }}
      />

      <label>Upload Excel File</label>
      <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />

      <button
        onClick={submitUpload}
        disabled={uploading}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "green",
          color: "white",
          cursor: "pointer",
        }}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {message && (
        <p style={{ marginTop: 20, fontWeight: "bold" }}>{message}</p>
      )}
    </div>
  );
}
