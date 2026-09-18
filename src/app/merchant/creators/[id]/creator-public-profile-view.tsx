"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/reference/ui/card";
import { Alert } from "@/components/reference/ui/alert";
import { SkeletonCard } from "@/components/reference/ui/skeleton";
import { getCreatorProfile } from "@/lib/merchant/real-store";
import { apiRequest, ApiError } from "@/lib/api";
import type { CreatorProfileMe } from "@/lib/creator/real-store";
import type { RealApplication } from "@/lib/merchant/types";

function initials(name: string | null): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * The creator's live profile, fetched by `creatorProfileId` (never by name, never "the first
 * creator returned by some list") — the one and only identity source for this page. If the
 * by-id lookup fails (its own doc comment in real-store.ts — unconfirmed against a live
 * response), this falls back to the *specific* application named in `?applicationId=`, fetched
 * by that application's own id, not any cached/global "last viewed creator" state. That fallback
 * is real, ID-scoped snapshot data (RealApplication.creatorName/creatorNiche/…), clearly labeled
 * as coming from the application rather than a live profile — never fabricated.
 */
export function CreatorPublicProfileView({ creatorProfileId }: { creatorProfileId: string }) {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");

  const [profile, setProfile] = useState<CreatorProfileMe | null>(null);
  const [fallbackApplication, setFallbackApplication] = useState<RealApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets prior id's result before refetching by the new id
    setProfile(null);
    setFallbackApplication(null);
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const live = await getCreatorProfile(creatorProfileId);
        if (!cancelled) setProfile(live);
      } catch (err) {
        if (cancelled) return;
        if (!applicationId) {
          setError(err instanceof ApiError ? err.uiMessage : "Couldn't load this creator's profile.");
          setLoading(false);
          return;
        }
        try {
          const applications = await apiRequest<RealApplication[]>("/applications/mine");
          const match = applications.find((a) => a.id === applicationId && a.creatorProfileId === creatorProfileId);
          if (!cancelled) {
            if (match) setFallbackApplication(match);
            else setError("Couldn't load this creator's profile.");
          }
        } catch {
          if (!cancelled) setError("Couldn't load this creator's profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [creatorProfileId, applicationId]);

  if (loading) return <SkeletonCard />;
  if (error) return <Alert variant="error">{error}</Alert>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/merchant/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Applications
      </Link>

      {profile ? (
        <>
          <Card className="flex items-center gap-4 p-6">
            <Avatar size="lg">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
              <AvatarFallback>{initials(profile.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">{profile.name ?? profile.handle}</p>
              <p className="text-sm text-muted-foreground">{profile.offersJoinedCount} offers joined</p>
            </div>
          </Card>

          <Card className="space-y-3 p-6">
            {profile.handle && (
              <div>
                <p className="text-xs text-muted-foreground">Handle</p>
                <p className="text-sm text-foreground">{profile.handle}</p>
              </div>
            )}
            {profile.niche && (
              <div>
                <p className="text-xs text-muted-foreground">Niche</p>
                <p className="text-sm text-foreground">{profile.niche}</p>
              </div>
            )}
            {profile.platform && (
              <div>
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="text-sm text-foreground">{profile.platform}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Audience size</p>
              <p className="text-sm text-foreground">{profile.audienceSize.toLocaleString()}</p>
            </div>
            {profile.engagementRate !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Engagement rate</p>
                <p className="text-sm text-foreground">{profile.engagementRate.toFixed(1)}%</p>
              </div>
            )}
          </Card>
        </>
      ) : fallbackApplication ? (
        <>
          <Alert variant="info">Their full profile isn&apos;t available yet — showing what they submitted on this application.</Alert>
          <Card className="flex items-center gap-4 p-6">
            <Avatar size="lg">
              {fallbackApplication.creatorAvatarUrl && <AvatarImage src={fallbackApplication.creatorAvatarUrl} alt="" />}
              <AvatarFallback>{initials(fallbackApplication.creatorName)}</AvatarFallback>
            </Avatar>
            <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
              {fallbackApplication.creatorName ?? "Unnamed creator"}
            </p>
          </Card>
          <Card className="space-y-3 p-6">
            {fallbackApplication.creatorHandle && (
              <div>
                <p className="text-xs text-muted-foreground">Handle</p>
                <p className="text-sm text-foreground">{fallbackApplication.creatorHandle}</p>
              </div>
            )}
            {fallbackApplication.creatorNiche && (
              <div>
                <p className="text-xs text-muted-foreground">Niche</p>
                <p className="text-sm text-foreground">{fallbackApplication.creatorNiche}</p>
              </div>
            )}
            {fallbackApplication.creatorPlatform && (
              <div>
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="text-sm text-foreground capitalize">{fallbackApplication.creatorPlatform}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Audience size</p>
              <p className="text-sm text-foreground">{fallbackApplication.creatorAudienceSize.toLocaleString()}</p>
            </div>
            {fallbackApplication.creatorEngagementRate !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Engagement rate</p>
                <p className="text-sm text-foreground">{fallbackApplication.creatorEngagementRate.toFixed(1)}%</p>
              </div>
            )}
          </Card>
        </>
      ) : (
        <Alert variant="error">Couldn&apos;t load this creator&apos;s profile.</Alert>
      )}
    </div>
  );
}
