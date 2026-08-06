import SignupForm from "./signup-form";

// Server component: renders the form directly in SSR so there is never a
// "Loading..." shell. The referral query survives refreshes because it lives
// in the URL.
export default function Signup({
  searchParams,
}: {
  searchParams: { ref_invoice?: string };
}) {
  return <SignupForm refInvoice={searchParams.ref_invoice ?? null} />;
}
