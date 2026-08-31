import Link from "next/link";
import { Building2, CreditCard, ShieldCheck, ChevronRight, Trash2 } from "lucide-react";
import { Card } from "@/components/reference/ui/card";

export const metadata = { title: "Settings — SellVia" };

const SECTIONS = [
  { href: "/merchant/settings/business", icon: Building2, title: "Business profile", description: "Business name, category, and store details." },
  { href: "/merchant/settings/billing", icon: CreditCard, title: "Billing method", description: "Connect the billing account SellVia charges commission to." },
  { href: "/merchant/settings/security", icon: ShieldCheck, title: "Security", description: "Password, two-factor authentication, and active sessions." },
] as const;

/** D10/D11/D12's shared hub — three focused sub-screens, plus F2's Delete Account entry point
 *  (Playbook 06) kept visually separate as a danger-zone card, not mixed into the regular list. */
export default function MerchantSettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your business, billing, and account security.</p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-4 p-5 transition-colors hover:border-border-hover">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
            </Card>
          </Link>
        ))}
      </div>

      <Link href="/merchant/settings/delete-account">
        <Card className="flex items-center gap-4 border-danger-border p-5 transition-colors hover:bg-danger-bg">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-danger">Delete account</p>
            <p className="text-xs text-muted-foreground">Ends both Merchant and Creator access, with a 14-day cancellable grace period.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground-2" aria-hidden="true" />
        </Card>
      </Link>
    </div>
  );
}
