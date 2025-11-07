// pages/api/exportUpload.js
import Airtable from "airtable";
import XLSX from "xlsx";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  try {
    const uploadId = req.query.upload_id;
    if (!uploadId) {
      return res.status(400).json({ error: "upload_id required" });
    }

    // ✅ Find UploadLog entry and get stats_record_ids[]
    const uploadRecords = await base("UploadLog")
      .select({
        filterByFormula: `{upload_id} = "${uploadId}"`,
      })
      .firstPage();

    if (uploadRecords.length === 0)
      return res.status(404).json({ error: "Upload ID not found" });

    const statsIds = uploadRecords[0].get("stats_record_ids") || [];

    if (statsIds.length === 0)
      return res.status(400).json({ error: "No stats linked to this upload" });

    // ✅ Fetch all stats rows
    const stats = await base("Stats")
      .select({
        filterByFormula: `OR(${statsIds.map(id => `RECORD_ID()="${id}"`).join(",")})`,
      })
      .all();

    const exportRows = stats.map((r) => ({
      Employee: r.get("Employee"),
      EmployeeID: r.get("Employee ID"),
      Criterion: r.get("Criterion"),
      Subcategory: r.get("Subcategory"),
      Value: r.get("Value"),
      UploadedBy: r.get("uploaded_by"),
      CreatedAt: r.get("created_at"),
    }));

    // ✅ Create Excel workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, "UploadData");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=${uploadId}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    return res.status(200).send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export upload data" });
  }
}
