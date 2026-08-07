import { cookies } from "next/headers";
import Landing from "./landing";

// Reads whether a session cookie is present so the landing page can address
// someone who already has an account: "Dashboard" instead of "Start free", and
// links into the app instead of into signup.
//
// The cookie is checked, not verified. Verifying means a round trip to Supabase
// on every visit to the busiest page on the site, and the only thing riding on
// the answer here is which label a button carries. If the session turns out to
// be stale, the middleware on /dashboard catches it and asks them to sign in —
// which it would have done anyway.
export default function Home() {
  const hasSession = cookies()
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));

  return <Landing signedIn={hasSession} />;
}
