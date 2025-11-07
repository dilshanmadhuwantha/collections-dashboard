import Airtable from "airtable";
import { v4 as uuidv4 } from "uuid";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { rows, managerName } = req.body;

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, error: "No rows provided" });
    }

    // ✅ Generate unique ID for this upload
    const uploadId = uuidv4();
    let inserted = 0;
    let recordIds = [];

    // ✅ Batch rows into groups of 10 (Airtable limit)
    const batches = [];
    let copyRows = [...rows];
    while (copyRows.length) {
      batches.push(copyRows.splice(0, 10));
    }

    // ✅ Create stats entries
    for (const batch of batches) {
      const formatted = batch.map((r) => ({
        fields: {
          Employee: r.Employee,
          "Employee ID": String(r["Employee ID"]),
          Criterion: r.Criterion,
          Subcategory: r.Subcategory ?? "",
          Value: Number(r.Value),
          source_upload: "Manager Upload",
          uploaded_by: managerName,

          // ✅ Correct field name for Airtable
          upload_id: uploadId
        },
      }));

      const created = await base("Stats").create(formatted);
      inserted += created.length;
      recordIds.push(...created.map((rec) => rec.id));
    }

    // ✅ Write upload log entry (FIXED)
    await base("UploadLog").create([
      {
        fields: {
          manager_name: managerName,
          row_count: inserted,

          // ✅ Correct field name (Airtable expects "upload_id")
          upload_id: uploadId,

          stats_record_ids: recordIds.join(","),
          note: "Manager Excel Upload",
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      inserted,
      upload_id: uploadId,
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
