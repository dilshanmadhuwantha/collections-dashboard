// pages/api/uploadStats.js
import Airtable from "airtable";
import { v4 as uuid } from "uuid";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { rows, managerName } = req.body;

    if (!rows || rows.length === 0)
      return res.status(400).json({ success: false, error: "No rows found" });

    if (!managerName)
      return res.status(400).json({ success: false, error: "Manager name required" });

    // ✅ Create a unique upload session ID
    const upload_id = uuid();
    let insertedRecordIds = [];

    // ✅ Airtable max 10 records per batch
    const batches = [];
    const rowsCopy = [...rows];
    while (rowsCopy.length) {
      batches.push(rowsCopy.splice(0, 10));
    }

    for (const batch of batches) {
      const formatted = batch.map((r) => ({
        fields: {
          Employee: r.Employee,
          "Employee ID": String(r["Employee ID"]),
          Criterion: r.Criterion,
          Subcategory: r.Subcategory || "",
          Value: Number(r.Value),
          uploaded_by: managerName,
          source_upload: upload_id
        }
      }));

      const created = await base("Stats").create(formatted);
      insertedRecordIds.push(...created.map((x) => x.id));
    }

    // ✅ Log upload history
    await base("UploadLog").create({
      upload_id,
      manager_name: managerName,
      row_count: insertedRecordIds.length,
      stats_record_ids: insertedRecordIds.join(","),
      created_at: new Date().toISOString(),
      note: "Upload completed"
    });

    return res.status(200).json({
      success: true,
      inserted: insertedRecordIds.length,
      upload_id
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
