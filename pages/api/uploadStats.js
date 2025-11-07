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

    const uploadId = uuidv4();
    let inserted = 0;
    let recordIds = [];

    const batches = [];
    let copyRows = [...rows];
    while (copyRows.length) {
      batches.push(copyRows.splice(0, 10));
    }

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
          uploadId: uploadId        // ✅ Correct field name
        },
      }));

      const created = await base("Stats").create(formatted);
      inserted += created.length;
      recordIds.push(...created.map((rec) => rec.id));
    }

    // ✅ WRITE LOG ENTRY
    await base("UploadLog").create([
      {
        fields: {
          manager_name: managerName,
          row_count: inserted,
          uploadId: uploadId,                 // ✅ Correct field name
          statsRecordIds: recordIds.join(","), // ✅ Correct field name
          note: "Manager Excel Upload"
        },
      },
    ]);

    res.status(200).json({ success: true, inserted, uploadId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}
