import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Where uploaded artwork is served from (a CDN or the bucket), so the page may load it.
function storageOrigin() {
  const raw = process.env.S3_PUBLIC_URL || (process.env.S3_BUCKET && process.env.S3_ENDPOINT);
  try {
    return raw ? new URL(raw).origin : "";
  } catch {
    return "";
  }
}

// Who may put the site in a frame. Only the site itself by default; set FRAME_ANCESTORS to
// allow another site to embed it, e.g. FRAME_ANCESTORS="https://digitemb.com https://www.digitemb.com".
const frameAncestors = (process.env.FRAME_ANCESTORS || "").trim() || "'self'";

function contentSecurityPolicy() {
  const storage = storageOrigin();
  return [
    "default-src 'self'",
    // Next.js and the theme script use inline scripts; everything else must come from this site.
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${storage}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${storage}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd
    ? [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        // Skipped in development: Next's dev server needs eval and websockets.
        { key: "Content-Security-Policy", value: contentSecurityPolicy() },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Lets a production build run into its own folder while `next dev` is using `.next`
  // (BUILD_DIR=.next-build npx next build).
  distDir: process.env.BUILD_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Product photos and ready-made designs rarely change: let browsers and CDNs keep them.
      {
        source: "/(mockups|designs)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
