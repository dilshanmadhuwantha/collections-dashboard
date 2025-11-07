// pages/logout.js
import { supabase } from "../utils/supabaseClient";

export default function Logout() {
  return (
    <div>
      <h2>Logging out...</h2>
    </div>
  );
}

export async function getServerSideProps() {
  await supabase.auth.signOut();

  return {
    redirect: {
      destination: "/login",
      permanent: false,
    },
  };
}
