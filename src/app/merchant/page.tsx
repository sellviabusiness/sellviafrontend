import { redirect } from "next/navigation";

/** Bare /merchant always lands on Overview — same pattern as app/onboarding/page.tsx. */
export default function MerchantIndexPage() {
  redirect("/merchant/overview");
}
