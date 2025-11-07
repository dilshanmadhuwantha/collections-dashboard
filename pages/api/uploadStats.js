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

    const upload_id = uuid();
    let insertedRecordIds = [];

    const batches = [];

    while (rows.length) batches.push(rows.splice(0, 10));

    for (const batch of batches) {
      const formatted = batch.map((r) => ({
        fields: {
          Employee: r.Employee,
          "Employee ID": String(r["Employee ID"]),
          Criterion: r.Criterion,
          Subcategory: r.Subcategory,
          Value: Number(r.Value),
          uploaded_by: managerName,
          source_upload: upload_id,
        },
      }));

      const created = await base("Stats").create(formatted);
      insertedRecordIds.push(...created.map((rec) => rec.id));
    }

    // ✅ Save upload history
    await base("UploadLog").create({
      upload_id,
      manager_name: managerName,
      row_count: insertedRecordIds.length,
      stats_record_ids: insertedRecordIds.join(","),
      note: "Upload completed",
    });

    res.status(200).json({
      success: true,
      inserted: insertedRecordIds.length,
      upload_id,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
