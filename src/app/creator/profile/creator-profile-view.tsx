"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/reference/ui/card";
import { Alert } from "@/components/reference/ui/alert";
import { SkeletonCard } from "@/components/reference/ui/skeleton";
import { getCreatorProfileMe, type CreatorProfileMe } from "@/lib/creator/real-store";
import { ApiError } from "@/lib/api";

function initials(name: string | null): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CreatorProfileView() {
  const [profile, setProfile] = useState<CreatorProfileMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCreatorProfileMe()
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.uiMessage : "Couldn't load your profile."));
  }, []);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (!profile) return <SkeletonCard />;

  return (
    <div className="mx-auto max-w-xl space-y-6">
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
    </div>
  );
}
