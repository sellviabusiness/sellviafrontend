/** Generic time-based greeting — not merchant-specific, reusable on the Creator dashboard too. */
export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/** First token of a full name — "Ali Rahman" -> "Ali". Falls back to the given default (usually
 *  the email's local part) if the name is empty. */
export function firstName(fullName: string | undefined, fallback: string): string {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || fallback;
}
