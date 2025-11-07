import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Only POST allowed" });

  try {
    const { record_ids, upload_id } = req.body;

    if (!record_ids || record_ids.length === 0)
      return res.status(400).json({ success: false, error: "No records provided" });

    // ✅ Delete records in batches (Airtable allows 10 each)
    const batches = [];
    while (record_ids.length) {
      batches.push(record_ids.splice(0, 10));
    }

    for (const batch of batches) {
      await base("Stats").destroy(batch);
    }

    // ✅ Mark UploadLog entry as undone
    await base("UploadLog").update(upload_id, {
      note: "UNDO completed",
    });

    res.status(200).json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
