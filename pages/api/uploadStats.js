import Airtable from "airtable";

// Initialize Airtable connection
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { rows } = req.body;

    // Validate request
    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, error: "No rows found" });
    }

    let inserted = 0;

    // Airtable allows max 10 records per batch
    const batches = [];
    while (rows.length) batches.push(rows.splice(0, 10));

    // Process each batch
    for (const batch of batches) {
      // Map Excel rows to Airtable fields
      const formatted = batch.map((r) => ({
        fields: {
          Employee: r.Employee,
          "Employee ID": String(r["Employee ID"]),
          Criterion: r.Criterion,
          Subcategory: r.Subcategory ?? "",
          Value: Number(r.Value),
        },
      }));

      // ✅ Add source tag for tracking uploads
      formatted.forEach((r) => {
        r.fields.source_upload = "Manager Upload";
        // "created_at" will be handled automatically by Airtable
      });

      // Create records in Airtable
      await base("Stats").create(formatted);
      inserted += formatted.length;
    }

    // Return success response
    res.status(200).json({ success: true, inserted });
  } catch (err) {
    console.error("Airtable upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
