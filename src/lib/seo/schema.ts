import { SITE_URL } from "./site"

// schema.org shapes only — no `schema-dts` dependency added (Next's JSON-LD
// guide mentions it as optional typing sugar; not worth a new dependency for
// this few fields). Availability enum and the paisa->rupee conversion are
// unverified against a real offer contract (API-CONTRACT-SHEET, unreachable)
// — OfferInput below is this file's own placeholder shape, isolated so it's
// a small swap once that's readable.
export type AvailabilityStatus = "in_stock" | "out_of_stock" | "preorder"

const AVAILABILITY_SCHEMA: Record<AvailabilityStatus, string> = {
  in_stock: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
}

export interface OfferInput {
  slug: string
  name: string
  description: string
  image?: string
  /** Integer paisa — same convention as lib/format/currency.ts. */
  priceInPaisa: number
  availability: AvailabilityStatus
}

/**
 * schema.org Product/Offer. `price` is the raw decimal string schema.org
 * expects (e.g. "1250.00") — deliberately NOT lib/format/currency.ts's
 * human "Rs 1,250" display string. Machine-readable price and human-visible
 * price are two different jobs; conflating them here would put a currency
 * symbol where a bare number belongs and break validators.
 */
export function buildProductJsonLd(offer: OfferInput) {
  const url = `${SITE_URL}/offers/${offer.slug}`
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: offer.name,
    description: offer.description,
    ...(offer.image ? { image: offer.image } : {}),
    url,
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: (offer.priceInPaisa / 100).toFixed(2),
      availability: AVAILABILITY_SCHEMA[offer.availability],
      url,
    },
  }
}
