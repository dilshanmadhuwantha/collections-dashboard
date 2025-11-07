// lib/targets.js
// Central place to control targets + color logic

export const TARGETS = {
  callPerDay: 250,            // per agent per day
  loginMinutesPerDay: 8 * 60, // 8 hours/day
  moneyMonthly: {
    most: 6_000_000,          // LKR per month
    newcomer: 4_000_000,
  },
  // Map “agent name” => "newcomer" (else defaults to "most")
  agentTier: {
    // "Amandi Upeksha": "most",
    // "New Joiner": "newcomer",
  },
};

const daysInMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};

const getTier = (name) => TARGETS.agentTier[name] || "most";

// HSL gradient red->green based on ratio 0..~1.2
export const colorForRatio = (ratio) => {
  const r = Math.max(0, Math.min(ratio, 1.2));
  const hue = Math.round(Math.min(120, r * 120)); // 0..120
  return `hsl(${hue} 70% 45%)`;
};

// Money target for one agent over many days (YYYY-MM-DD strings)
export const moneyTargetForAgentOverDays = (agent, isoDays) => {
  if (!isoDays?.length) return 0;
  const monthly = TARGETS.moneyMonthly[getTier(agent)] || TARGETS.moneyMonthly.most;
  let total = 0;
  const cache = new Map(); // YYYY-MM -> per-day target
  for (const iso of isoDays) {
    const d = new Date(iso);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!cache.has(ym)) cache.set(ym, monthly / daysInMonth(d));
    total += cache.get(ym);
  }
  return total;
};

export const callTargetForDays  = (numDays) => TARGETS.callPerDay * Math.max(1, numDays || 0);
export const loginTargetForDays = (numDays) => TARGETS.loginMinutesPerDay * Math.max(1, numDays || 0);
