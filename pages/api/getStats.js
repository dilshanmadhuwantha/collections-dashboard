import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

// Helper: convert date filters
function buildDateFormula(from, to) {
  const parts = [];

  if (from) {
    parts.push(`IS_AFTER({created_at}, DATETIME_PARSE("${from} 00:00", "YYYY-MM-DD HH:mm"))`);
    parts.push(`IS_SAME({created_at}, DATETIME_PARSE("${from}", "YYYY-MM-DD"), 'day')`);
  }
  if (to) {
    parts.push(`IS_BEFORE({created_at}, DATETIME_PARSE("${to} 23:59", "YYYY-MM-DD HH:mm"))`);
    parts.push(`IS_SAME({created_at}, DATETIME_PARSE("${to}", "YYYY-MM-DD"), 'day')`);
  }

  if (!parts.length) return "";

  if (from && to) {
    const fromCond = `OR(${parts[0]}, ${parts[1]})`;
    const toCond = `OR(${parts[2]}, ${parts[3]})`;
    return `AND(${fromCond}, ${toCond})`;
  }

  if (from) return `OR(${parts[0]}, ${parts[1]})`;
  if (to) return `OR(${parts[0]}, ${parts[1]})`;
}

export default async function handler(req, res) {
  try {
    const { from, to } = req.query;

    const options = {
      maxRecords: 10000,
    };

    const formula = buildDateFormula(from, to);
    if (formula) options.filterByFormula = formula;

    const records = await base("Stats").select(options).all();

    const data = records.map((r) => ({
      id: r.id,
      ...r.fields,
      created_at: r.fields.created_at || null,
    }));

    res.status(200).json({ success: true, data, count: data.length });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
