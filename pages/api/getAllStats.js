import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  try {
    const records = await base("Stats").select({}).all();

    const formatted = records.map((rec) => ({
      id: rec.id,
      ...rec.fields,
      date: rec.fields.date || null,
      created_at: rec.fields.created_at || null,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
