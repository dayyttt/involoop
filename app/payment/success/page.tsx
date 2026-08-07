import PaymentSuccess from "./success-client";

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { order?: string; session_id?: string };
}) {
  return <PaymentSuccess sessionId={searchParams.order ?? searchParams.session_id ?? null} />;
}
