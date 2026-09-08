import { redirect } from "next/navigation";

/** Bare /creator always lands on Overview — same pattern as app/merchant/page.tsx. */
export default function CreatorIndexPage() {
  redirect("/creator/overview");
}
