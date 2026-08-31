import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DeleteAccountView } from "@/components/account/delete-account-view";

export const metadata = { title: "Delete account — SellVia" };

export default async function MerchantDeleteAccountPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/merchant/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Delete account</h1>
        <p className="text-sm text-muted-foreground">Deleting your account ends both Merchant and Creator access, not just this one.</p>
      </div>
      <DeleteAccountView email={session.email} roles={session.roles} />
    </div>
  );
}
