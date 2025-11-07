import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

// Helper: delete up to 10 IDs per call (Airtable limit)
async function deleteInChunks(table, ids) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10));
  }
  for (const c of chunks) {
    await base(table).destroy(c);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { uploadId } = req.body;
    if (!uploadId) return res.status(400).json({ success: false, error: "uploadId required" });

    // 1) Find matching Stats rows
    const stats = await base("Stats")
      .select({
        maxRecords: 10000,
        filterByFormula: `{source_upload_id} = '${uploadId}'`,
      })
      .all();

    const statIds = stats.map((r) => r.id);

    // 2) Delete Stats rows
    if (statIds.length) {
      await deleteInChunks("Stats", statIds);
    }

    // 3) Delete UploadLog record
    await base("UploadLog").destroy(uploadId);

    res.status(200).json({ success: true, deleted: statIds.length });
  } catch (err) {
    console.error("undoUpload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
