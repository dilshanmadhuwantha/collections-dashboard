import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/router";

export default function UploadPage() {
  const router = useRouter();

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

      // ✅ Read Excel into JSON
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

      // ✅ Save manager name
      localStorage.setItem("managerName", managerName);

      setStatus("uploading");
      setMessage(`Uploading ${rows.length} rows…`);

      const res = await fetch("/api/uploadStats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, managerName }),
      });

      const json = await res.json();

      if (json.success) {
        setStatus("success");
        setMessage(
          `✅ Upload complete! Added ${json.inserted} rows. Upload ID: ${json.upload_id}`
        );

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

      <p style={styles.tip}>
        ✅ Upload your daily performance sheet.  
        ✅ After upload, you can review history and undo.
      </p>

      {/* ✅ Manager Name */}
      <div style={{ marginBottom: 20 }}>
        <strong>Manager Name: </strong>
        <input
          type="text"
          placeholder="Enter your name"
          value={managerName}
          onChange={(e) => setManagerName(e.target.value)}
          style={styles.input}
        />
      </div>

      {/* ✅ File Upload */}
      <label style={styles.uploadButton}>
        Choose Excel File
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          disabled={disabled}
          style={{ display: "none" }}
        />
      </label>

      {/* ✅ Upload status */}
      {status && (
        <div style={styles.statusBox(status)}>
          {message}
        </div>
      )}

      {/* ✅ New Button — View Upload History */}
      <button
        onClick={() => router.push("/manager/uploads")}
        style={styles.historyButton}
      >
        📄 View Upload History
      </button>
    </div>
  );
}

// ✅ STYLES
const styles = {
  page: {
    padding: "40px",
    maxWidth: 600,
    margin: "auto",
    fontFamily: "Arial",
  },
  h1: {
    fontSize: 28,
    marginBottom: 15,
  },
  tip: {
    color: "#666",
    marginBottom: 20,
  },
  input: {
    padding: 8,
    width: "60%",
    borderRadius: 5,
    border: "1px solid #ccc",
    fontSize: 16,
  },
  uploadButton: {
    padding: "12px 20px",
    background: "#0066ff",
    color: "white",
    borderRadius: 6,
    cursor: "pointer",
    display: "inline-block",
    marginTop: 10,
    marginBottom: 20,
  },
  statusBox: (type) => ({
    padding: 12,
    marginTop: 15,
    borderRadius: 5,
    background:
      type === "success"
        ? "#d4f8d4"
        : type === "error"
        ? "#ffd4d4"
        : "#e8e8e8",
    color: "#333",
    fontWeight: "bold",
  }),
  historyButton: {
    marginTop: 25,
    padding: "12px 20px",
    background: "#222",
    color: "white",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 16,
  },
};
