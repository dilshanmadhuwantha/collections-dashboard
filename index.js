
import { useRouter } from 'next/router';
export default function Home() {
  const router = useRouter();
  return (
    <div style={{ padding: 24 }}>
      <h1>Performance Dashboard</h1>
      <p>Choose login type:</p>
      <button onClick={() => router.push('/agent/dashboard')}>Agent (demo)</button>
      <button onClick={() => router.push('/manager/dashboard')}>Manager (demo)</button>
      <p style={{ marginTop: 20 }}>This is a starter demo. Use manager upload page to test Excel import.</p>
    </div>
  );
}
