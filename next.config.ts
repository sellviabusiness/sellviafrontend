import type { NextConfig } from "next";

// Same-origin proxy for Kratos — Ory's documented Next.js pattern, keeps the
// session cookie first-party instead of cross-origin. Kratos's own
// serve.public.base_url must be set to match this path (infra-side config,
// outside this repo) so the action URLs it returns in flows are already
// same-origin. Unverified against Hosting Strategy / API Authentication docs
// (unreachable) — the pattern itself is Ory's own, not a guess.
const ORY_SDK_URL = process.env.ORY_SDK_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!ORY_SDK_URL) {
      console.warn(
        "[ory] ORY_SDK_URL not set — /api/.ory/* proxy is a no-op until it is."
      );
      return [];
    }
    return [
      {
        source: "/api/.ory/:path*",
        destination: `${ORY_SDK_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
