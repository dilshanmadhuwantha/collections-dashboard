import Airtable from "airtable";
import XLSX from "xlsx";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  try {
    const uploadId = req.query.upload_id; // ✅ correct query parameter

    if (!uploadId) {
      return res.status(400).json({ error: "Missing upload_id" });
    }

    // ✅ 1. Get Stats rows that belong to this upload
    const records = await base("Stats")
      .select({
        filterByFormula: `{upload_id} = "${uploadId}"`, // ✅ exact Airtable field name
        maxRecords: 10000
      })
      .all();

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "No rows found for this upload_id" });
    }

    // ✅ 2. Convert to worksheet format
    const rows = records.map(rec => rec.fields);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "UploadData");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // ✅ 3. Return Excel file
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="upload_${uploadId}.xlsx"`);

    res.send(buffer);

  } catch (err) {
    console.error("EXPORT ERROR:", err);
    return res.status(500).json({ error: "Failed to export upload data" });
  }
}
