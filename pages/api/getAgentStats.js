import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: "Missing email in request",
    });
  }

  try {
    const records = await base("Stats")
      .select({
        filterByFormula: `{email} = '${email}'`,
        maxRecords: 500,
      })
      .all();

    const data = records.map((r) => r.fields);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
