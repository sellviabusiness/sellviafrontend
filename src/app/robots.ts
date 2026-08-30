import type { MetadataRoute } from "next"

import { ROLE_PREFIX } from "@/lib/nav/config"

// Single source of truth with proxy.ts's PROTECTED list (src/proxy.ts) and
// the robots noindex meta on those same layouts (accessibility/SEO tasks) —
// three independent mechanisms all pointing at the same three prefixes
// rather than three copies of a path list that could drift apart.
const DASHBOARD_PATHS = Object.values(ROLE_PREFIX).map((prefix) => `${prefix}/`)

// Auth flow pages (dynamic ?flow= ids, no content value) and the Kratos
// proxy path — already noindex via meta (auth task), disallowed here too so
// crawlers never even fetch them.
const NON_CONTENT_PATHS = ["/login", "/registration", "/recovery", "/verification", "/api/"]

const DISALLOW = [...DASHBOARD_PATHS, ...NON_CONTENT_PATHS]

// Deliberate policy (task's own wording): known AI crawlers get an explicit
// group rather than being left to infer intent from the wildcard rule alone
// — some sites block these by default; SellVia wants agents able to read
// and cite public offer pages (see the JSON-LD/OpenGraph task). Same rules
// as everyone else, named on purpose. List is my own call from public
// documentation of each crawler, unverified against a doc that named these
// specifically (unreachable) — add/remove agents here as needed, this is
// the one place that list lives.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: DISALLOW },
      { userAgent: "*", disallow: DISALLOW },
    ],
    // No sitemap.xml exists yet — omitted rather than pointing at a dead link.
  }
}
