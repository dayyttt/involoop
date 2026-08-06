import PaymentSuccess from "./success-client";

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  return <PaymentSuccess sessionId={searchParams.session_id ?? null} />;
}
