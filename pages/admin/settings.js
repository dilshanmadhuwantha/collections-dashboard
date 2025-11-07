import { useEffect, useState } from "react";
import { TARGETS } from "../../lib/targets";

export default function Settings() {
  const [callPerDay, setCallPerDay] = useState(TARGETS.callPerDay);
  const [loginMinutesPerDay, setLoginMinutesPerDay] = useState(TARGETS.loginMinutesPerDay);
  const [most, setMost] = useState(TARGETS.moneyMonthly.most);
  const [newcomer, setNewcomer] = useState(TARGETS.moneyMonthly.newcomer);
  const [tiers, setTiers] = useState(JSON.stringify(TARGETS.agentTier, null, 2));

  useEffect(() => {
    const saved = localStorage.getItem("settings_targets");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setCallPerDay(s.callPerDay ?? callPerDay);
        setLoginMinutesPerDay(s.loginMinutesPerDay ?? loginMinutesPerDay);
        setMost(s.moneyMonthly?.most ?? most);
        setNewcomer(s.moneyMonthly?.newcomer ?? newcomer);
        setTiers(JSON.stringify(s.agentTier || {}, null, 2));
      } catch {/* ignore */}
    }
  }, []);

  const save = () => {
    let parsed = {};
    try { parsed = JSON.parse(tiers); } catch { parsed = {}; }
    const payload = {
      callPerDay: Number(callPerDay || 0),
      loginMinutesPerDay: Number(loginMinutesPerDay || 0),
      moneyMonthly: { most: Number(most||0), newcomer: Number(newcomer||0) },
      agentTier: parsed,
    };
    localStorage.setItem("settings_targets", JSON.stringify(payload));
    alert("Saved locally. Copy values manually into lib/targets.js for production.");
  };

  return (
    <div style={{ padding:24, fontFamily:"sans-serif" }}>
      <h1>Admin Settings (Local)</h1>

      <Box title="Daily Targets">
        <Field label="Calls per day">
          <input type="number" value={callPerDay} onChange={e=>setCallPerDay(e.target.value)} />
        </Field>
        <Field label="Login minutes per day">
          <input type="number" value={loginMinutesPerDay} onChange={e=>setLoginMinutesPerDay(e.target.value)} />
        </Field>
      </Box>

      <Box title="Monthly Money Targets">
        <Field label="Most staff (LKR)">
          <input type="number" value={most} onChange={e=>setMost(e.target.value)} />
        </Field>
        <Field label="Newcomers (LKR)">
          <input type="number" value={newcomer} onChange={e=>setNewcomer(e.target.value)} />
        </Field>
      </Box>

      <Box title="Agent Tier Mapping (JSON)">
        <textarea rows={10} value={tiers} onChange={e=>setTiers(e.target.value)} style={{ width:"100%" }} />
        <button onClick={save} style={{ marginTop:10 }}>Save Locally</button>
        <p style={{ fontSize:12, color:"#6b7280" }}>
          Tip: copy these values into <code>lib/targets.js</code> to make them global.
        </p>
      </Box>
    </div>
  );
}
function Box({ title, children }) {
  return <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:14, marginTop:16 }}>
    <div style={{ fontWeight:800, marginBottom:8 }}>{title}</div>
    {children}
  </div>;
}
function Field({ label, children }) {
  return <div style={{ marginBottom:10 }}>
    <div style={{ fontSize:12, color:"#6b7280", marginBottom:4 }}>{label}</div>
    {children}
  </div>;
}
