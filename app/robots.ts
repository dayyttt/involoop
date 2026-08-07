import type { MetadataRoute } from "next";

// Invoice pages already carry noindex in their own metadata — they are private
// documents that happen to be reachable by link. This keeps crawlers out of the
// app and the API entirely.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api", "/invoice"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
