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
  // The value matters, not just the name. Signing out can leave the cookie in
  // place with its value emptied, and a presence-only test then keeps calling a
  // signed-out visitor a customer.
  const hasSession = cookies()
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        cookie.name.includes("auth-token") &&
        cookie.value.trim().length > 20
    );

  return <Landing signedIn={hasSession} />;
}
