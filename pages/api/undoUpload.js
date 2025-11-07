// pages/api/undoUpload.js
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Only POST allowed" });

  try {
    const { upload_id } = req.body;

    if (!upload_id)
      return res.status(400).json({ success: false, error: "upload_id required" });

    // ✅ Find the upload log entry
    const logs = await base("UploadLog")
      .select({ filterByFormula: `{upload_id} = '${upload_id}'` })
      .firstPage();

    if (!logs.length)
      return res.status(404).json({ success: false, error: "Upload not found" });

    const log = logs[0];

    const idsRaw = log.get("stats_record_ids") || "";
    const recordIds = idsRaw.split(",").map((x) => x.trim()).filter(Boolean);

    let deleteCount = 0;

    // ✅ Airtable allows deletion max 10 at a time
    while (recordIds.length) {
      const chunk = recordIds.splice(0, 10);
      await base("Stats").destroy(chunk);
      deleteCount += chunk.length;
    }

    // ✅ Update the UploadLog entry
    await base("UploadLog").update(log.id, {
      note: "UNDO ✅",
    });

    return res.status(200).json({
      success: true,
      deleted: deleteCount
    });
  } catch (error) {
    console.error("UNDO ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
