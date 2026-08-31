/** Shared money formatting for every merchant screen — one place, so Sales/Payouts/Overview
 *  never drift into different formats. PKR per the senior's requirement — whole rupees, no
 *  paisa decimals in this MVP's inputs/display. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "0 creator applied" / "1 creator applied" / "2 creators applied" — plural only kicks in at 2+,
 *  per explicit instruction (not standard English pluralization, but that's the spec). */
export function formatCreatorCount(count: number): string {
  const noun = count <= 1 ? "creator" : "creators";
  return `${count} ${noun} applied`;
}

/** "2 days ago" / "3 hours ago" / "just now" — coarse, no library needed for this scale. */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) {
    const m = Math.floor(diffMs / minute);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const h = Math.floor(diffMs / hour);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diffMs / day);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** "a***@gmail.com" style masking — first char, stars, then the domain/tail unmasked. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.charAt(0)}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

/** "****1234" — last 4 digits visible, rest masked. */
export function maskAccountNumber(value: string): string {
  const last4 = value.slice(-4);
  return `${"*".repeat(4)}${last4}`;
}

/** URL-safe slug from a name — "Maya Chen" -> "maya-chen", "Glow Serum" -> "glow-serum". Reused
 *  for both creator ref codes and offer product slugs. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** "4.2%" — one decimal, never NaN/Infinity (0/0 renders as "0.0%"). */
export function formatPercent(value: number): string {
  return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;
}
