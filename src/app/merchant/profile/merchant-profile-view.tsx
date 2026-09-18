"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/reference/ui/card";
import { Alert } from "@/components/reference/ui/alert";
import { Skeleton } from "@/components/reference/ui/skeleton";
import { getMerchantProfileMe, type MerchantProfileMe } from "@/lib/merchant/real-store";
import { ApiError } from "@/lib/api";

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function MerchantProfileView() {
  const [profile, setProfile] = useState<MerchantProfileMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMerchantProfileMe()
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.uiMessage : "Couldn't load your profile."));
  }, []);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (!profile) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card className="flex items-center gap-4 p-6">
        <Avatar size="lg">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
          <AvatarFallback>{initials(profile.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">{profile.name ?? profile.businessName}</p>
          <p className="text-sm text-muted-foreground">{profile.offersListedCount} offers listed</p>
        </div>
      </Card>

      <Card className="space-y-3 p-6">
        <div>
          <p className="text-xs text-muted-foreground">Business name</p>
          <p className="text-sm text-foreground">{profile.businessName}</p>
        </div>
        {profile.businessCategory && (
          <div>
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="text-sm text-foreground">{profile.businessCategory}</p>
          </div>
        )}
        {profile.website && (
          <div>
            <p className="text-xs text-muted-foreground">Website</p>
            <a href={profile.website} target="_blank" rel="noreferrer" className="text-sm text-accent-foreground underline">{profile.website}</a>
          </div>
        )}
      </Card>
    </div>
  );
}
