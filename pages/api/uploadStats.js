import Airtable from "airtable";

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { rows, managerName } = req.body;

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, error: "No rows found" });
    }

    if (!managerName || managerName.trim() === "") {
      return res.status(400).json({ success: false, error: "Manager name missing" });
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

      // ✅ Add metadata fields
      formatted.forEach((r) => {
        r.fields.source_upload = "Manager Upload";
        r.fields.uploaded_by = managerName;      // ✅ Manager name stored
        // created_at is auto-filled by Airtable
      });

      // ✅ Send to Airtable
      await base("Stats").create(formatted);
      inserted += formatted.length;
    }

    return res.status(200).json({ success: true, inserted });

  } catch (err) {
    console.error("Upload API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
