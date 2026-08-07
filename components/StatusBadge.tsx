import { appText, type Lang } from "@/lib/i18n";

// Lives here rather than inside the dashboard page because the invoice modal
// shows the same badge, and two copies would eventually disagree about what
// "awaiting_verification" looks like.
export default function StatusBadge({ status, lang }: { status: string; lang: Lang }) {
  const t = (k: string) => appText(lang, k);
  if (status === "paid") return <span className="badge badge-paid">{t("status.paid")}</span>;
  if (status === "awaiting_verification")
    return <span className="badge badge-warn">{t("status.awaiting")}</span>;
  if (status === "payment_pending")
    return <span className="badge badge-warn">{t("status.pending")}</span>;
  if (status === "failed" || status === "refunded")
    return <span className="badge badge-unpaid">{t("status.failed")}</span>;
  return <span className="badge badge-unpaid">{t("status.unpaid")}</span>;
}
