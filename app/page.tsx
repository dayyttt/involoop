import { cookies } from "next/headers";
import Landing from "./landing";

// Reads whether the visitor still has a live session, so the landing page can
// address someone who already has an account: "Dashboard" instead of
// "Start free", and links into the app instead of into signup.
//
// This used to test only that a session cookie existed and had content. An
// expired session leaves exactly that behind, so the page kept calling a
// signed-out visitor a customer: they clicked "Dashboard", the middleware
// bounced them to "Sign in to continue where you left off", and the landing
// went on insisting they were signed in. The expiry is right there in the
// cookie, so there is no reason to guess.
//
// Still no round trip to Supabase. Nothing is authorised here — the only thing
// riding on the answer is which label a button carries, and anyone who forges a
// cookie to read "Dashboard" is stopped by the middleware the moment they use
// it.
function hasLiveSession(): boolean {
  const all = cookies().getAll();

  // Supabase splits a large session across sb-<ref>-auth-token.0, .1, … so the
  // chunks have to be reassembled in order before anything can be read.
  const parts = all
    .filter((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (parts.length === 0) return false;

  const raw = parts.map((c) => c.value).join("");
  if (raw.trim().length <= 20) return false;

  try {
    const encoded = raw.startsWith("base64-") ? raw.slice("base64-".length) : raw;
    const json = raw.startsWith("base64-")
      ? Buffer.from(encoded, "base64").toString("utf8")
      : decodeURIComponent(encoded);
    const session = JSON.parse(json);

    const expiresAt = Number(session?.expires_at);
    if (Number.isFinite(expiresAt)) {
      return expiresAt * 1000 > Date.now();
    }
    // A shape we do not recognise but that carries a token: treat as signed in
    // and let the middleware be the judge, which is what happened before.
    return !!session?.access_token;
  } catch {
    return false;
  }
}

export default function Home() {
  return <Landing signedIn={hasLiveSession()} />;
}
