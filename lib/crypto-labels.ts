import { appText, type Lang } from "@/lib/i18n";
import type { CryptoLabels } from "@/components/CryptoPayPanel";

// One place the crypto panel's wording is assembled, because both directions
// show the same panel and copy that drifts apart is copy that starts lying in
// one of them.
export function cryptoLabels(lang: Lang): CryptoLabels {
  const t = (k: string) => appText(lang, k);
  return {
    loading: t("invoice.cryptoLoading"),
    amountLabel: t("invoice.cryptoAmount"),
    networkLabel: t("invoice.cryptoNetwork"),
    recipientLabel: t("invoice.cryptoRecipient"),
    openWallet: t("invoice.cryptoOpen"),
    scanHint: t("invoice.cryptoScan"),
    manualWarn: t("invoice.cryptoManualWarn"),
    sentTitle: t("invoice.cryptoSentTitle"),
    sentBody: t("invoice.cryptoSentBody"),
    feesHint: t("invoice.cryptoFees"),
    exactHint: t("invoice.cryptoExact"),
    waiting: t("invoice.cryptoWaiting"),
    detected: t("invoice.cryptoDetected"),
    verifying: t("invoice.cryptoVerifying"),
    confirmed: t("invoice.cryptoConfirmed"),
    expired: t("invoice.cryptoExpired"),
    payHere: t("invoice.cryptoPayHere"),
    paying: t("invoice.cryptoPaying"),
    errNoUsdc: t("invoice.cryptoErrNoUsdc"),
    errInsufficient: t("invoice.cryptoErrInsufficient"),
    errBuild: t("invoice.cryptoErrBuild"),
    retry: t("invoice.cryptoRetry"),
    viewTx: t("invoice.cryptoViewTx"),
    expiresIn: t("invoice.cryptoExpiresIn"),
    checkNow: t("invoice.cryptoCheckNow"),
    underpaid: t("invoice.cryptoUnderpaid"),
    mismatch: t("invoice.cryptoMismatch"),
    noWallet: t("invoice.cryptoNoWallet"),
    overpaid: t("invoice.cryptoOverpaid"),
  };
}
