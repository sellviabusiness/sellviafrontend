// Pakistan-only for MVP, same as currency.ts — Asia/Karachi is objectively
// correct for Pakistan (single IANA zone, no DST), not a guess. Date-shape
// conventions (day-month-year order, "25-Aug-2026" style) come straight from
// this runtime's real "en-PK" ICU data, verified the same way as PKR.
const PK_LOCALE = "en-PK"
const PK_TIMEZONE = "Asia/Karachi"

const dateFormatter = new Intl.DateTimeFormat(PK_LOCALE, {
  timeZone: PK_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat(PK_LOCALE, {
  timeZone: PK_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const timeFormatter = new Intl.DateTimeFormat(PK_LOCALE, {
  timeZone: PK_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
})

/** e.g. "25-Aug-2026". */
export function formatDate(input: string | Date): string {
  return dateFormatter.format(new Date(input))
}

/** e.g. "25-Aug-2026, 5:00 pm". */
export function formatDateTime(input: string | Date): string {
  return dateTimeFormatter.format(new Date(input))
}

/** e.g. "5:00 pm". */
export function formatTime(input: string | Date): string {
  return timeFormatter.format(new Date(input))
}

/** "2h ago", "3d ago" — falls back to formatDate() past a week so it doesn't grow unreadable ("47d ago"). */
export function formatRelative(input: string | Date): string {
  const date = new Date(input)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}
