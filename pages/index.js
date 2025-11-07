// pages/index.js

export default function Home() {
  return (
    <div
      style={{
        padding: "50px",
        fontFamily: "Arial",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      <h1>Collections Performance Dashboard</h1>
      <p>Select your role:</p>

      <div style={{ marginTop: 20 }}>
        <a href="/agent" style={{ marginRight: 20, fontSize: 18 }}>
          Agent Login
        </a>
        <a href="/manager/dashboard" style={{ marginRight: 20, fontSize: 18 }}>
          Manager Dashboard
        </a>
      </div>

      <hr style={{ margin: "30px 0" }} />

      <h3>Manager Tools</h3>

      <ul style={{ lineHeight: "32px", fontSize: 16 }}>
        <li>
          <a href="/manager/dashboard">📊 Manager Dashboard</a>
        </li>
        <li>
          <a href="/manager/monthly">📅 Monthly Summary</a>
        </li>
        <li>
          <a href="/manager/leaderboard">🏆 Leaderboard</a>
        </li>
        <li>
          <a href="/manager/uploads">📁 Upload History</a>
        </li>
        <li>
          <a href="/manager/upload">📤 Excel Upload</a>
        </li>
        <li>
          <a href="/admin/settings">⚙️ Admin Settings</a>
        </li>
      </ul>
    </div>
  );
}
