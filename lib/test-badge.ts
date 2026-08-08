/**
 * Which "this is a test" line a payment surface should show — or none.
 *
 * The rule is that a badge names every rail that is not real, and disappears
 * entirely when they all are. Both halves matter. A page that stays silent
 * about sandbox lets someone believe a test charge was real; a page that still
 * says "no real money will be charged" after the switch to live tells someone
 * their card is safe while it is being charged. The second is the one that
 * costs a person money, and it was the shipped behaviour: the upgrade modal
 * hard-coded the sandbox line for every PayPal payment.
 *
 * Derived from the server's own configuration, never from a guess.
 */
export function testBadgeKey({
  paypalLive,
  paypalShown,
  cryptoShown,
  cryptoNetwork,
}: {
  paypalLive: boolean;
  paypalShown: boolean;
  cryptoShown: boolean;
  cryptoNetwork: string | null;
}): string | null {
  const paypalTest = paypalShown && !paypalLive;
  const cryptoTest = cryptoShown && cryptoNetwork !== "solana-mainnet";

  if (paypalTest && cryptoTest) return "invoice.testBadgeBoth";
  if (paypalTest) return "invoice.testBadge";
  if (cryptoTest) return "invoice.testBadgeCrypto";
  return null;
}
