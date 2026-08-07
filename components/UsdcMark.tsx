// The USDC mark, drawn rather than fetched.
//
// A coin with a dollar on it, in Circle's blue. That combination is the whole
// explanation for someone who has never heard of USDC: it is a dollar, and it
// is a coin. The word "USDC" beside it teaches nobody anything on its own.
//
// Inline SVG because it is twelve lines, needs no network request, and stays
// sharp at any size — an icon that arrives late or blurry undermines exactly
// the confidence a payment button needs.
export default function UsdcMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="USDC"
      focusable="false"
    >
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      {/* The ring keeps the glyph from touching the edge at small sizes, where
          a full-bleed dollar reads as a smudge. */}
      <circle cx="16" cy="16" r="12.5" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" />
      <path
        d="M16 8.2v1.6c2.1.2 3.6 1.3 3.9 3h-2.2c-.2-.8-.9-1.3-1.9-1.4v3.2c2.6.5 4.3 1.3 4.3 3.6 0 2-1.5 3.4-4.1 3.6v1.6h-1.5v-1.6c-2.3-.2-3.9-1.4-4.2-3.3h2.3c.2 1 1 1.5 2.1 1.6v-3.4c-2.5-.5-4.1-1.3-4.1-3.5 0-1.9 1.5-3.2 4-3.4V8.2H16zm-1.5 3.2c-1 .1-1.6.6-1.6 1.4 0 .7.5 1.1 1.6 1.4v-2.8zm1.5 8.9c1.1-.1 1.7-.6 1.7-1.4 0-.8-.5-1.2-1.7-1.5v2.9z"
        fill="#fff"
      />
    </svg>
  );
}
