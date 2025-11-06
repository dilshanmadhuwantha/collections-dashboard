import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { rows } = req.body;
    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, error: "No rows found" });
    }

    let inserted = 0;

    // Airtable allows max 10 records per batch
    const batches = [];
    while (rows.length) batches.push(rows.splice(0, 10));

    for (const batch of batches) {
      const formatted = batch.map((r) => ({
        fields: {
          Employee: r.Employee,
          "Employee ID": String(r["Employee ID"]),
          Criterion: r.Criterion,
          Subcategory: r.Subcategory ?? "",
          Value: Number(r.Value),
        },
      }));
formatted.forEach((r) => {
    r.fields.uploaded_at = new Date().toISOString();
    r.fields.source = "Manager Upload";
  });
      await base("Stats").create(formatted);
      inserted += formatted.length;
    }

    res.status(200).json({ success: true, inserted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
