/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The invoice page is a payment surface that gets opened from a chat app by
  // people who did not choose to visit it. These headers are the cheap part of
  // deserving that trust: it cannot be framed by another site, its type cannot
  // be sniffed, and it does not leak full URLs — which contain invoice ids — to
  // third parties through the referer.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
