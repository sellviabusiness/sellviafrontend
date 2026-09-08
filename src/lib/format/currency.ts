// Pakistan-only, PKR-only for MVP — no multi-currency path anywhere (task's
// own instruction), so nothing here takes a currency or locale param.
//
// Unverified against Business Rules / Money Flow docs (unreachable: private
// submodule, no bypass secret): amounts are assumed to be integer minor
// units — paisa, 1 PKR = 100 paisa — same reasoning as storing money in
// cents, avoids float rounding. If the real API returns decimal rupees
// instead, this file is the one place to change.
//
// The formatting itself isn't a guess — verified against this runtime's
// actual ICU data (not assumed): Intl.NumberFormat("en-PK", { style:
// "currency", currency: "PKR" }) already renders "Rs 125,000" — standard
// international digit grouping (not lakh/crore), "Rs" symbol, 0 fraction
// digits by default (paisa isn't shown in everyday PKR amounts). No
// hand-rolled formatting needed.
const PKR_LOCALE = "en-PK"

const amountFormatter = new Intl.NumberFormat(PKR_LOCALE, {
  style: "currency",
  currency: "PKR",
})

const signedAmountFormatter = new Intl.NumberFormat(PKR_LOCALE, {
  style: "currency",
  currency: "PKR",
  signDisplay: "exceptZero",
})

/** e.g. 125000 (paisa) -> "Rs 1,250". */
export function formatPKR(amountInPaisa: number): string {
  return amountFormatter.format(amountInPaisa / 100)
}

/** Same as formatPKR, with an explicit +/- — for a signed delta (refund, adjustment, payout line). */
export function formatPKRSigned(amountInPaisa: number): string {
  return signedAmountFormatter.format(amountInPaisa / 100)
}
