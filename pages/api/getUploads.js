import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  try {
    const records = await base("UploadLog")
      .select({
        maxRecords: 200,
        sort: [{ field: "created_at", direction: "desc" }],
      })
      .all();

    const data = records.map((r) => ({
      id: r.id,
      manager_name: r.get("manager_name") || "",
      row_count: r.get("row_count") || 0,
      note: r.get("note") || "",
      created_at: r.get("created_at") || r._rawJson.createdTime,
    }));

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
