// pages/manager/upload.js
import { useState } from "react";

export default function ManagerUpload() {
  const [file, setFile] = useState(null);
  const [manager, setManager] = useState("");
  const [msg, setMsg] = useState("");

  const handleUpload = async () => {
    if (!manager) return alert("Enter manager name");
    if (!file) return alert("Select an Excel file");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("managerName", manager);

    setMsg("Uploading...");

    const res = await fetch("/api/uploadStats", {
      method: "POST",
      body: formData,
    });

    const json = await res.json();

    if (json.success) {
      setMsg(`✅ Uploaded ${json.inserted} rows`);
    } else {
      setMsg("❌ Upload failed: " + json.error);
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
        style={{ padding: 8, marginBottom: 20 }}
      /><br />

      <label>Upload Excel File</label><br />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        style={{ marginBottom: 20 }}
      /><br />

      <button
        onClick={handleUpload}
        style={{ padding: "8px 16px", background: "green", color: "white" }}
      >
        Upload
      </button>

      <p style={{ marginTop: 20 }}>{msg}</p>
    </div>
  );
}
