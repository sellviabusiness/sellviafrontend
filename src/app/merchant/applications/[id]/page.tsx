import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/auth/config";
import { ApplicationReviewView } from "./application-review-view";
import { RealApplicationReviewView } from "./real-application-review-view";

export const metadata = { title: "Review application" };

/**
 * D6 — the real, network-backed AI fit summary (components/ai/fit-summary-panel.tsx) is GATED
 * OFF for now: backend confirmed (PLAYBOOK.md) there is no ai_services module at all yet
 * (fit-summary is post-MVP), so GET /ai/applications/:id/fit-summary doesn't exist. The panel
 * already degrades to nothing on a failed fetch (see its own doc comment) — invisible, not
 * wrong, but still a guaranteed-to-fail network call on every page load until the endpoint
 * ships. Swap `fitSummary={null}` back for `<FitSummaryPanel applicationId={id} />` (re-add the
 * import) once it does.
 */
export default async function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return isMockMode ? (
    <ApplicationReviewView email={session.email} applicationId={id} fitSummary={null} />
  ) : (
    <RealApplicationReviewView applicationId={id} />
  );
}
