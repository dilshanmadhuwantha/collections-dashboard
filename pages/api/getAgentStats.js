// pages/api/getAgentStats.js
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

// Safe date helper
function inRange(d, from, to) {
  if (!d) return false;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return false;
  if (!from && !to) return true;
  if (from && t < new Date(from).getTime()) return false;
  if (to) {
    // include end date (till 23:59:59)
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

export default async function handler(req, res) {
  try {
    const { empId, dateFrom, dateTo } = req.query;
    if (!empId) {
      return res.status(400).json({ success: false, error: "empId required" });
    }

    // Pull agent rows (limit high enough for typical daily usage)
    const records = await base("Stats")
      .select({
        filterByFormula: `{Employee ID} = '${String(empId)}'`,
        maxRecords: 5000,
      })
      .all();

    const data = records
      .map((r) => r.fields)
      .filter((r) => inRange(r.created_at, dateFrom, dateTo));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
