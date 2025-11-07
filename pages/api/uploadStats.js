import Airtable from "airtable";
import { v4 as uuidv4 } from "uuid";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { rows, managerName } = req.body;

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No rows provided",
      });
    }

    if (!managerName) {
      return res.status(400).json({
        success: false,
        error: "Manager name missing",
      });
    }

    // ✅ Create a unique upload ID for this batch
    const uploadId = uuidv4();
    let inserted = 0;
    let recordIds = [];

    // Airtable only allows 10 records per batch
    const batches = [];
    const copy = [...rows];
    while (copy.length) batches.push(copy.splice(0, 10));

    for (const batch of batches) {
      const formatted = batch.map((r) => ({
        fields: {
          Employee: r.Employee || "",
          "Employee ID": r["Employee ID"] ? String(r["Employee ID"]) : "",
          email: r.email || "",                   // ✅ NEW — required for agent stats
          Criterion: r.Criterion,
          Subcategory: r.Subcategory || "",
          Value: Number(r.Value || 0),

          // Upload metadata
          source_upload: "Manager Upload",
          uploaded_by: managerName,
          upload_id: uploadId,
        },
      }));

      const created = await base("Stats").create(formatted);
      inserted += created.length;
      recordIds.push(...created.map((rec) => rec.id));
    }

    // ✅ Write upload log entry
    await base("UploadLog").create([
      {
        fields: {
          manager_name: managerName,
          row_count: inserted,
          upload_id: uploadId,
          stats_record_ids: recordIds.join(","),
          note: "Manager Excel Upload",
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      inserted,
      uploadId,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
