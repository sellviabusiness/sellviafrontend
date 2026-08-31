import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { FitSummaryPanel } from "@/components/ai/fit-summary-panel";
import { ApplicationReviewView } from "./application-review-view";

export const metadata = { title: "Review application — SellVia" };

/**
 * D6 — the real, network-backed AI fit summary (FitSummaryPanel) is a Server Component, so it's
 * rendered here (server) and passed down into the client view as a prop rather than imported
 * into that client file directly — the standard RSC composition boundary. It degrades to nothing
 * on failure (see the component's own doc comment), it doesn't block this page.
 */
export default async function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return (
    <ApplicationReviewView
      email={session.email}
      applicationId={id}
      fitSummary={<FitSummaryPanel applicationId={id} />}
    />
  );
}
