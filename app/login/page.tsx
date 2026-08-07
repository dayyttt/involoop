import LoginForm from "./login-form";

// Server component: the plan intent arrives in the URL and is read here, so the
// client never has to inspect window.location during render (which used to make
// the server and client markup disagree).
export default function Login({
  searchParams,
}: {
  searchParams: { plan?: string; next?: string };
}) {
  const plan = searchParams.plan === "starter" || searchParams.plan === "pro" ? searchParams.plan : null;
  // Only ever an in-app path, never an absolute URL someone appended.
  const next = searchParams.next?.startsWith("/") ? searchParams.next : null;
  return <LoginForm plan={plan} next={next} />;
}
