import Link from "next/link";
import { Building2, CreditCard, ShieldCheck, ChevronRight, Trash2, Moon } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { ThemeToggle } from "@/components/reference/theme/theme-toggle";

export const metadata = { title: "Settings" };

const SECTIONS = [
  { href: "/merchant/settings/business", icon: Building2, title: "Business profile", description: "Business name, category, and store details." },
  { href: "/merchant/settings/billing", icon: CreditCard, title: "Billing method", description: "Connect the billing account SellVia charges commission to." },
  { href: "/merchant/settings/security", icon: ShieldCheck, title: "Security", description: "Password, two-factor authentication, and active sessions." },
] as const;

/** D10/D11/D12's shared hub, plus F2's Delete Account entry point (Playbook 06) kept visually
 *  separate as a danger-zone card. Grouped into labeled sections (Preferences / Account / Danger
 *  zone) — Business profile/Billing/Security render as one bordered list with internal dividers
 *  rather than three separate cards, the common "settings list" pattern. */
export default function MerchantSettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your business, billing, and account security.</p>
      </div>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground-2">Preferences</h2>
        <Card className="flex items-center gap-4 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-foreground">
            <Moon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Appearance</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark theme.</p>
          </div>
          <ThemeToggle />
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground-2">Account</h2>
        <Card className="divide-y divide-border p-0">
          {SECTIONS.map(({ href, icon: Icon, title, description }) => (
            <Link key={href} href={href} className="flex items-center gap-4 p-5 transition-colors first:rounded-t-[var(--radius-md)] last:rounded-b-[var(--radius-md)] hover:bg-foreground/[0.03]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground-2" aria-hidden="true" />
            </Link>
          ))}
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-danger">Danger zone</h2>
        <Link href="/merchant/settings/delete-account">
          <Card className="flex items-center gap-4 border-danger-border p-5 transition-colors hover:bg-danger-bg">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-danger">Delete account</p>
              <p className="text-xs text-muted-foreground">Ends your account access, with a 14-day cancellable grace period.</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground-2" aria-hidden="true" />
          </Card>
        </Link>
      </section>
    </div>
  );
}
