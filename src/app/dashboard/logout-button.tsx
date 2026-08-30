"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/reference/ui/button";
import { authProvider } from "@/lib/auth/provider";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const { logout_token } = await authProvider.createLogoutFlow();
      await authProvider.submitLogout(logout_token);
      await authProvider.onLoggedOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button variant="secondary" onClick={handleLogout} loading={loading}>
      Log out
    </Button>
  );
}
