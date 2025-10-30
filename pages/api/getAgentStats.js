import Airtable from "airtable";

// Connect to your Airtable base using environment variables
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  const { empId } = req.query;

  try {
    const records = await base("Stats")
      .select({
        filterByFormula: `{Employee ID} = '${empId}'`,
        maxRecords: 200,
      })
      .all();

    const data = records.map((r) => r.fields);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}
