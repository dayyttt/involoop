import { NextRequest, NextResponse } from "next/server";
import { capturePayment } from "@/lib/payment-capture";

export const dynamic = "force-dynamic";

// POST is the normal path: the PayPal buttons on the page approve an order and
// hand back its id, and the client stays where they were.
export async function POST(req: NextRequest) {
  const { orderID } = await req.json().catch(() => ({}));
  if (!orderID || typeof orderID !== "string") {
    return NextResponse.json({ error: "orderID is required" }, { status: 400 });
  }

  const result = await capturePayment(orderID);
  if (result.retryable) {
    // 200, not an error status: nothing went wrong with the request, the buyer
    // just needs to choose a different way to pay.
    return NextResponse.json({ paid: false, restart: true });
  }
  if (!result.ok) {
    return NextResponse.json({ error: "Payment could not be completed." }, { status: 502 });
  }
  return NextResponse.json({ paid: result.paid, plan: result.plan ?? null });
}

// GET is the fallback: PayPal redirects here when the buttons could not open
// their popup, so the whole approval happened on PayPal's own domain. Same
// capture, then back to a page that says what happened.
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app";
  const orderId = req.nextUrl.searchParams.get("token");
  const publicId = req.nextUrl.searchParams.get("invoice");
  const planParam = req.nextUrl.searchParams.get("plan");

  if (!orderId) {
    return NextResponse.redirect(`${base}/invoice/${publicId ?? ""}?payment=missing`);
  }

  const result = await capturePayment(orderId);

  if (planParam || result.plan) {
    return result.ok
      ? NextResponse.redirect(`${base}/dashboard?upgraded=${result.plan?.plan ?? planParam}`)
      : NextResponse.redirect(`${base}/#pricing`);
  }
  if (!result.ok) {
    return NextResponse.redirect(`${base}/invoice/${publicId ?? ""}?payment=failed`);
  }
  return NextResponse.redirect(`${base}/payment/success?order=${orderId}`);
}
