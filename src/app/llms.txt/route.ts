import { SITE_URL, SITE_NAME } from "@/lib/seo/site"

// llms.txt (llmstxt.org) — not a Next.js file convention (unlike
// robots.ts/sitemap.ts), so this is a plain Route Handler rather than a
// special metadata file. Dynamic rather than a static public/llms.txt so it
// shares SITE_URL with everything else instead of a second hardcoded
// domain. Content is minimal on purpose — this app currently has two real
// public routes (home, /offers/[slug]); extend this as more public content
// exists rather than padding it out now.
export async function GET() {
  const body = `# ${SITE_NAME}

> Pakistan affiliate/referral marketplace connecting Merchants and Creators around offers. PKR-only, Pakistan-only for MVP — see /robots.txt for crawler policy.

## Public pages

- [Home](${SITE_URL}/): Site overview.
- Offer pages: ${SITE_URL}/offers/{slug} — each carries accurate PKR price and availability as schema.org Product/Offer JSON-LD.

## Notes for agents

- Prices are PKR only, no multi-currency path.
- Merchant, Creator, and Admin dashboards (/merchant/*, /creator/*, /admin/*) require authentication and are deliberately excluded from crawling — see /robots.txt.
- Known AI crawlers are explicitly welcomed on the public pages above — see /robots.txt for the exact policy, listed by name rather than left to the wildcard rule.
`

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
