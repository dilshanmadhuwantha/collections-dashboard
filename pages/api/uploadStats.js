import Airtable from "airtable";
import { v4 as uuidv4 } from "uuid";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { rows, managerName, note } = req.body;

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, error: "No rows found" });
    }

    // ✅ Generate REAL upload ID
    const uploadId = uuidv4();

    // ✅ Insert into Stats table
    const batches = [];
    let inserted = 0;

    const statsRecords = [];

    for (let i = 0; i < rows.length; i += 10) {
      const batch = rows.slice(i, 10 + i);

      const formatted = batch.map((r) => ({
        fields: {
          Employee: r.Employee,
          "Employee ID": String(r["Employee ID"] || ""),
          Criterion: r.Criterion,
          Subcategory: r.Subcategory || "",
          Value: Number(r.Value || 0),
          upload_id: uploadId, // ✅ VERY IMPORTANT
        },
      }));

      const created = await base("Stats").create(formatted);
      created.forEach((rec) => statsRecords.push(rec.id));

      inserted += formatted.length;
    }

    // ✅ Store Upload Log (correct)
    await base("UploadLog").create([
      {
        fields: {
          manager_name: managerName || "Unknown",
          row_count: inserted,
          upload_id: uploadId, // ✅ MUST store this ID
          stats_record_ids: statsRecords.join(","),
          note: note || "",
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
    return res.status(500).json({ success: false, error: err.message });
  }
}
