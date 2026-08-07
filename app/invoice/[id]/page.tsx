import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getPublicInvoice } from "@/lib/invoice-server";
import { formatMoney } from "@/lib/money";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import InvoiceClient from "./invoice-client";

// The invoice page is the product's distribution surface: it gets pasted into
// WhatsApp, email and DMs. It is server-rendered so the link preview carries
// the sender, the client, and the amount instead of a generic site title, and
// so a client on a slow phone sees the invoice on first paint.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const invoice = await getPublicInvoice(params.id);
  if (!invoice) return { title: "Invoice not found · Involoop" };

  const lang: Lang = cookies().get(LANG_COOKIE)?.value === "id" ? "id" : "en";
  const money = formatMoney(invoice.amount, invoice.currency, lang === "id" ? "id-ID" : "en-US");
  const paid = invoice.status === "paid";

  const title =
    lang === "id"
      ? `Invoice ${money} dari ${invoice.sender_name}`
      : `Invoice for ${money} from ${invoice.sender_name}`;
  const description =
    lang === "id"
      ? `${invoice.description} · untuk ${invoice.client_name} · ${paid ? "Lunas" : "Belum dibayar"} · ${invoice.number}`
      : `${invoice.description} · for ${invoice.client_name} · ${paid ? "Paid" : "Unpaid"} · ${invoice.number}`;

  return {
    title: `${title} · Involoop`,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false, follow: false },
  };
}

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const invoice = await getPublicInvoice(params.id);
  if (!invoice) notFound();
  return <InvoiceClient invoice={invoice} />;
}
