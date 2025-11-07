import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { rows, managerName } = req.body;
    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, error: "No rows found" });
    }
    if (!managerName || !managerName.trim()) {
      return res.status(400).json({ success: false, error: "Manager name missing" });
    }

    // 1) Create upload log (we'll use its record id as the batch upload_id)
    const [logRec] = await base("UploadLog").create([
      {
        fields: {
          manager_name: managerName,
          row_count: rows.length,
          note: "Created via /api/uploadStats",
        },
      },
    ]);
    const uploadId = logRec.id; // e.g. "recXXXX"

    // 2) Insert to Stats in batches of 10 and tag source_upload_id
    let inserted = 0;
    const copy = [...rows];
    const batches = [];
    while (copy.length) batches.push(copy.splice(0, 10));

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
          source_upload_id: uploadId, // <-- important for Undo
        },
      }));
      await base("Stats").create(formatted);
      inserted += formatted.length;
    }

    // 3) Update UploadLog.row_count to actually inserted (in case of trimming)
    await base("UploadLog").update([
      { id: uploadId, fields: { row_count: inserted } },
    ]);

    return res.status(200).json({ success: true, inserted, uploadId });
  } catch (err) {
    console.error("Upload API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
