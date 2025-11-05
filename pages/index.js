export default function Home() {
  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Collections Performance Dashboard</h1>
      <p>Select your role:</p>
      <div style={{ marginTop: "20px" }}>
        <a href="/agent" style={{ marginRight: "20px" }}>
          Agent
        </a>
        <a href="/manager/dashboard">Manager</a>
      </div>
    </div>
  );
}
