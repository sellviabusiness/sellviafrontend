# Products, Offer Rework, Shopify Admin Connect & Profile Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Products catalog (hard prerequisite for offer creation under the new `productId`-required backend contract), rework offer creation/edit around it, add a Shopify Admin API connection card, and ship merchant/creator profile pages.

**Architecture:** Extend the existing `real-store.ts` per-domain API layer (mirrors the backend's `{ data, error }` envelope via the shared `apiRequest()` client) with new typed functions per endpoint. New screens follow this repo's existing real-mode conventions exactly: server `page.tsx` does `getServerSession()` + redirect, a `"use client"` `*-view.tsx` does the actual UI + `apiRequest` calls, `@/components/reference/ui/*` primitives for anything that already exists there (Card/Button/Input/Select/Label/Alert/StatusBadge/EmptyState), falling through to `@/components/ui/*` (Radix-based) only for primitives `reference/ui` doesn't have (Dialog, Tabs, Avatar) — this is a deliberate first mixing of the two component systems in a merchant/creator page, called out per-task below.

**Tech Stack:** Next.js 16 App Router, TypeScript, Clerk auth (already wired), `radix-ui` (already a dependency, unified package import style — see `tabs.tsx`), Tailwind.

**Spec:** The 7-section spec pasted into this session (2026-09-17) — "Products page / Shopify Admin Connection card / Offer creation form rework / Offer edit / Publish button / Merchant profile page / Creator profile page." No separate spec file exists; this plan *is* the durable record of it. Every `/products*`, `/users/merchant-profile/shopify-admin-connection`, and offer-field addition below is copied verbatim from that spec's request/response shapes.

## Global Constraints

- Every new API function goes in the relevant `real-store.ts` (`src/lib/merchant/real-store.ts` or `src/lib/creator/real-store.ts`) — never a raw `fetch()` in a view component. All auth is automatic via `apiRequest()` + `ApiAuthBridge`; never pass `authToken` manually from a client component.
- No test framework exists in this repo (`package.json` has no `test` script, no Jest/Vitest/Playwright). Do not introduce one for this work — verify each task with `npx tsc --noEmit` (must pass clean) plus a manual check against the running dev server (`npm run dev`) and the real Render backend. This matches how every existing `real-*` file in this codebase was actually verified (see their own "BUG FOUND LIVE" comments).
- Component reuse: `Card`, `Button`, `Input`, `Select`, `Label`, `Alert`, `FormErrorText`, `StatusBadge`, `EmptyState`, `ConfirmDialog` come from `@/components/reference/ui/*` (what every existing merchant/creator real-mode page already imports). `Dialog`, `Tabs`, `Avatar` come from `@/components/ui/*` (Radix-based) — `reference/ui` has no equivalents. A new `Switch` goes in `@/components/ui/switch.tsx` (built here, Task 0) since neither directory has one.
- `RealOffer`/`CreateRealOfferInput`/`ProductRead` types stay in `src/lib/merchant/real-store.ts` (not `types.ts`) — matches where `ProductRead` already lives from this session's earlier Product-first-offers work; don't relocate for churn's sake.
- Money is always `priceCents`/`amountCents` (integer cents) at the API boundary, converted to/from whole-currency display strings only inside view components — same round-trip pattern `real-new-offer-view.tsx` already uses (`Math.round(priceValue * 100)`).
- `isMockMode` split: every new page here is real-mode only (no mock counterpart requested by the spec) — no `isMockMode` branch needed in these new files, but existing files being *modified* (sidebar, settings hub, offers list/detail) already branch on it elsewhere; don't disturb that.

---

## File Structure

```
src/components/ui/switch.tsx                                    [NEW]

src/lib/merchant/real-store.ts                                  [MODIFIED — many additions]
src/lib/creator/real-store.ts                                   [MODIFIED — one addition]

src/app/merchant/products/page.tsx                              [NEW]
src/app/merchant/products/products-view.tsx                     [NEW]
src/app/merchant/products/add-product-dialog.tsx                [NEW]

src/app/merchant/offers/new/offer-form.tsx                      [NEW — shared create/edit form]
src/app/merchant/offers/new/real-new-offer-view.tsx              [MODIFIED — becomes thin wrapper]
src/app/merchant/offers/[id]/edit/page.tsx                       [MODIFIED or NEW — check existing mock file first]
src/app/merchant/offers/[id]/edit/real-edit-offer-view.tsx       [NEW]

src/app/merchant/settings/page.tsx                                [MODIFIED — add SECTIONS entry]
src/app/merchant/settings/shopify/page.tsx                        [NEW]
src/app/merchant/settings/shopify/shopify-settings-view.tsx       [NEW]

src/app/merchant/offers/real-offers-view.tsx                     [MODIFIED — Edit button/link]
src/app/merchant/offers/[id]/real-offer-detail-view.tsx          [MODIFIED — Edit button/link, fix stale comment]

src/app/merchant/profile/page.tsx                                [NEW]
src/app/merchant/profile/merchant-profile-view.tsx                [NEW]
src/app/creator/profile/page.tsx                                  [NEW]
src/app/creator/profile/creator-profile-view.tsx                  [NEW]

src/components/merchant/sidebar.tsx                               [MODIFIED — Products + Profile nav entries]
src/components/creator/sidebar.tsx                                 [MODIFIED — Profile nav entry]
```

Section 5 (Publish button) needs **no task** — it already exists (`real-offer-detail-view.tsx`, `status === "draft"` → Publish button calling `setOfferStatus(id, "live")`). Confirmed by this session's own codebase survey. Skip it.

---

### Task 0: Switch primitive

**Files:**
- Create: `src/components/ui/switch.tsx`

**Interfaces:**
- Produces: `Switch` component, props `{ checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; id?: string; className?: string }` — used by Task 6 (OfferForm fulfillment/discount toggles).

- [ ] **Step 1: Write the component**

Mirror `src/components/ui/tabs.tsx`'s import/style conventions (Radix via the unified `radix-ui` package, `cva` not needed here — Switch has only one visual state pair).

```tsx
"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-foreground/20 transition-colors outline-none",
        "data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow ring-0 transition-transform",
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
```

- [ ] **Step 2: Verify**

Run `npx tsc --noEmit`. Expected: no new errors. (No render check possible until Task 6 actually uses it — that's where it gets a real visual check.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/switch.tsx
git commit -m "feat(ui): add Switch primitive (radix-ui, no existing toggle component)"
```

---

### Task 1: `real-store.ts` — Product API surface

**Files:**
- Modify: `src/lib/merchant/real-store.ts`

**Interfaces:**
- Consumes: nothing new (uses existing `apiRequest`).
- Produces: `ProductRead` (extended shape), `listProducts()`, `getProduct(id)`, `importProduct(productUrl)` (existing, unchanged), `importProductByShopifyVariant(shopifyProductId, shopifyVariantId)` (new), `createProduct` (existing, unchanged), `ShopifyCatalogItemRead`, `listShopifyCatalog()`. All consumed by Task 3 (Products page) and Task 6 (OfferForm's product picker).

- [ ] **Step 1: Extend `ProductRead` to the full spec shape**

Replace the current minimal `ProductRead` (added earlier this session for the offer-creation fix) with the full shape the spec's backend actually returns:

```ts
export interface ProductRead {
  id: string;
  merchantProfileId: string;
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  productUrl: string | null;
  category: "physical" | "digital" | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Add `listProducts` / `getProduct`**

```ts
/** The merchant's own product catalog — feeds the Products page (list) and the offer-creation
 *  product picker (Task 6). Every status included; the Products page itself decides what to
 *  show/hide for "archived". */
export async function listProducts(): Promise<ProductRead[]> {
  return apiRequest<ProductRead[]>("/products");
}

export async function getProduct(productId: string): Promise<ProductRead> {
  return apiRequest<ProductRead>(`/products/${productId}`);
}
```

- [ ] **Step 3: Add `importProductByShopifyVariant` (catalog-browse import path)**

Keep the existing `importProduct(productUrl)` (URL-paste path) untouched. Add the second import shape for the "browse your Shopify catalog" tab:

```ts
/** Imports a Product from an item already resolved via `listShopifyCatalog` — the
 *  "browse your Shopify catalog" tab's import call, distinct from `importProduct`'s
 *  URL-paste path even though both hit the same endpoint (different body shape). */
export async function importProductByShopifyVariant(
  shopifyProductId: string,
  shopifyVariantId: string,
): Promise<ProductRead> {
  return apiRequest<ProductRead>("/products/import", {
    method: "POST",
    body: { shopifyProductId, shopifyVariantId },
  });
}
```

- [ ] **Step 4: Add `ShopifyCatalogItemRead` + `listShopifyCatalog`**

```ts
export interface ShopifyCatalogItemRead {
  shopifyProductId: string;
  shopifyVariantId: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  productUrl: string;
}

/** 409 SHOPIFY_NOT_CONNECTED surfaces as a thrown ApiError with that `.code` — callers gate the
 *  "browse catalog" tab on Task 8's connection status instead of relying on this throw alone, but
 *  must still handle it (a connection can be revoked between page load and this call). */
export async function listShopifyCatalog(): Promise<ShopifyCatalogItemRead[]> {
  return apiRequest<ShopifyCatalogItemRead[]>("/products/shopify-catalog");
}
```

- [ ] **Step 5: Verify**

`npx tsc --noEmit` — clean. `createProduct` and `importProduct` already exist from earlier this session; confirm they still compile against the new `ProductRead` shape unchanged (they return `Promise<ProductRead>`, so widening the type is source-compatible, no caller changes needed yet — `real-new-offer-view.tsx`'s current usage gets replaced wholesale in Task 7 anyway).

- [ ] **Step 6: Commit**

```bash
git add src/lib/merchant/real-store.ts
git commit -m "feat(merchant): add Products API surface (list/get/catalog-import)"
```

---

### Task 2: Merchant sidebar — Products nav entry

**Files:**
- Modify: `src/components/merchant/sidebar.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `/merchant/products` reachable from both `RailLinks()` and `NavLinks()` (both map the same `NAV_ITEMS` array — one edit updates both).

- [ ] **Step 1: Add the nav entry**

In the `NAV_ITEMS` array (currently `Overview, Offers, Applications, Sales, Billing`), insert **Products** right after Overview (it's the thing everything else depends on, so it belongs near the top):

```ts
import { LayoutGrid, Package, Megaphone, ClipboardList, Receipt, CreditCard, Settings, X } from "lucide-react";
// ...
const NAV_ITEMS = [
  { href: "/merchant/overview", label: "Overview", icon: LayoutGrid },
  { href: "/merchant/products", label: "Products", icon: Package },
  { href: "/merchant/offers", label: "Offers", icon: Megaphone },
  { href: "/merchant/applications", label: "Applications", icon: ClipboardList },
  { href: "/merchant/sales", label: "Sales", icon: Receipt },
  { href: "/merchant/billing", label: "Billing", icon: CreditCard },
] as const;
```

(`Profile` is added in Task 13, not here — keeping this task's diff scoped to Products.)

- [ ] **Step 2: Verify**

`npx tsc --noEmit` clean. Run `npm run dev`, sign in as a merchant, confirm "Products" appears in both the desktop rail (icon + tooltip) and mobile drawer, linking to `/merchant/products` (404 is fine/expected until Task 3 ships the route — just confirm the link renders and navigates).

- [ ] **Step 3: Commit**

```bash
git add src/components/merchant/sidebar.tsx
git commit -m "feat(merchant): add Products nav entry"
```

---

### Task 3: Products page — list view + empty state

**Files:**
- Create: `src/app/merchant/products/page.tsx`
- Create: `src/app/merchant/products/products-view.tsx`

**Interfaces:**
- Consumes: `listProducts()` (Task 1), `ProductRead` (Task 1). Renders `AddProductDialog` (Task 4 — build as a stub returning `null` here if sequencing strictly task-by-task; fill in for real once Task 4 lands).
- Produces: the "Add Product" trigger and `onProductAdded` callback signature `(product: ProductRead) => void` that Task 4's dialog will call — Task 4 must match this exact prop name/shape.

- [ ] **Step 1: `page.tsx`** — mirror every other merchant `page.tsx`'s guard pattern exactly (e.g. `src/app/merchant/offers/page.tsx`):

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { ProductsView } from "./products-view";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <ProductsView />;
}
```

- [ ] **Step 2: `products-view.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { EmptyState } from "@/components/reference/ui/empty-state";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import { Skeleton } from "@/components/reference/ui/skeleton";
import { Alert } from "@/components/reference/ui/alert";
import { listProducts, type ProductRead } from "@/lib/merchant/real-store";
import { ApiError } from "@/lib/api";
import { AddProductDialog } from "./add-product-dialog";

function formatPrice(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export function ProductsView() {
  const [products, setProducts] = useState<ProductRead[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function refresh() {
    try {
      setProducts(await listProducts());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your products.");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleProductAdded(product: ProductRead) {
    setProducts((prev) => (prev ? [product, ...prev] : [product]));
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">Every product here can become an offer.</p>
        </div>
        {products && products.length > 0 && (
          <Button onClick={() => setDialogOpen(true)}>Add product</Button>
        )}
      </div>

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {!products ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="You haven't added any products yet"
          description="Paste a Shopify link, browse your connected Shopify catalog, or enter one manually."
          action={<Button onClick={() => setDialogOpen(true)}>Add your first product</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="space-y-3 p-4">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- external Shopify CDN URL
                <img src={p.imageUrl} alt="" className="h-32 w-full rounded-[var(--radius-sm)] border border-border object-cover" />
              )}
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{p.name}</p>
                <StatusBadge tone={p.status === "active" ? "success" : "neutral"}>{p.status}</StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatPrice(p.priceCents, p.currency)}{p.category ? ` · ${p.category}` : ""}
              </p>
            </Card>
          ))}
        </div>
      )}

      <AddProductDialog open={dialogOpen} onOpenChange={setDialogOpen} onProductAdded={handleProductAdded} />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

`npx tsc --noEmit` will fail until Task 4 creates `add-product-dialog.tsx` — that's expected and fine to leave red between Task 3 and Task 4 if executing sequentially in one sitting; if there's a real gap between them, stub `add-product-dialog.tsx` with a no-op component matching the prop signature so Task 3 can be committed independently:

```tsx
// temporary stub, replaced in Task 4
export function AddProductDialog(_props: { open: boolean; onOpenChange: (v: boolean) => void; onProductAdded: (p: import("@/lib/merchant/real-store").ProductRead) => void }) {
  return null;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/merchant/products/page.tsx src/app/merchant/products/products-view.tsx
git commit -m "feat(merchant): add Products list page"
```

---

### Task 4: Add Product dialog — 3 tabs (paste URL / browse catalog / manual)

**Files:**
- Create: `src/app/merchant/products/add-product-dialog.tsx`
- Modify (remove stub if Task 3 used one): `src/app/merchant/products/add-product-dialog.tsx`

**Interfaces:**
- Consumes: `importProduct`, `importProductByShopifyVariant`, `createProduct`, `listShopifyCatalog`, `ShopifyCatalogItemRead`, `ProductRead` (Task 1). `getShopifyAdminConnection` (Task 8 — **not built yet at this point in the build order**; Section 2 comes after Section 3 per the spec's own sequencing, so Tab B's gate check must degrade gracefully: attempt `listShopifyCatalog()` directly and branch on the `SHOPIFY_NOT_CONNECTED` `ApiError.code` rather than pre-checking a connection-status endpoint that doesn't exist yet. Once Task 8 ships, this can optionally be tightened to disable the tab proactively — not required, current approach is already correct per the spec's own documented 409 handling).
- Produces: calls `onProductAdded(product)` prop exactly as Task 3 expects.

- [ ] **Step 1: Write the dialog**

```tsx
"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Select } from "@/components/reference/ui/select";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import {
  importProduct,
  importProductByShopifyVariant,
  createProduct,
  listShopifyCatalog,
  type ProductRead,
  type ShopifyCatalogItemRead,
} from "@/lib/merchant/real-store";
import { OFFER_CATEGORIES } from "@/lib/merchant/constants";
import { ApiError } from "@/lib/api";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: (product: ProductRead) => void;
}

export function AddProductDialog({ open, onOpenChange, onProductAdded }: AddProductDialogProps) {
  const [tab, setTab] = useState("url");

  // Tab A — paste a Shopify link
  const [productUrl, setProductUrl] = useState("");
  const [urlSubmitting, setUrlSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  async function handleUrlSubmit() {
    if (!productUrl.trim()) return;
    setUrlSubmitting(true);
    setUrlError(null);
    try {
      const product = await importProduct(productUrl.trim());
      onProductAdded(product);
      setProductUrl("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "PRODUCT_FETCH_FAILED") {
        setUrlError("Couldn't fetch that link.");
        setTab("manual");
      } else {
        setUrlError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
      }
    } finally {
      setUrlSubmitting(false);
    }
  }

  // Tab B — browse connected Shopify catalog
  const [catalog, setCatalog] = useState<ShopifyCatalogItemRead[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogNotConnected, setCatalogNotConnected] = useState(false);
  const [importingVariantId, setImportingVariantId] = useState<string | null>(null);

  async function loadCatalog() {
    setCatalogError(null);
    setCatalogNotConnected(false);
    try {
      setCatalog(await listShopifyCatalog());
    } catch (err) {
      if (err instanceof ApiError && err.code === "SHOPIFY_NOT_CONNECTED") {
        setCatalogNotConnected(true);
      } else {
        setCatalogError(err instanceof ApiError ? err.uiMessage : "Couldn't load your Shopify catalog.");
      }
    }
  }

  async function handleCatalogPick(item: ShopifyCatalogItemRead) {
    setImportingVariantId(item.shopifyVariantId);
    setCatalogError(null);
    try {
      const product = await importProductByShopifyVariant(item.shopifyProductId, item.shopifyVariantId);
      onProductAdded(product);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PRODUCT_ALREADY_IMPORTED") {
        onOpenChange(false); // already in their catalog — just close, per spec
      } else if (err instanceof ApiError && err.code === "NOT_FOUND") {
        setCatalogError("That product isn't in your store anymore — refresh and try again.");
      } else {
        setCatalogError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
      }
    } finally {
      setImportingVariantId(null);
    }
  }

  // Tab C — manual entry
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  async function handleManualSubmit() {
    const nextErrors: Record<string, string> = {};
    if (manualName.trim().length < 2) nextErrors.name = "Enter a product name.";
    const priceValue = Number(manualPrice);
    if (!manualPrice.trim() || Number.isNaN(priceValue) || priceValue <= 0) nextErrors.price = "Enter a price above 0.";
    if (Object.keys(nextErrors).length > 0) {
      setManualErrors(nextErrors);
      return;
    }
    setManualErrors({});
    setManualSubmitting(true);
    setManualError(null);
    try {
      const product = await createProduct({
        name: manualName.trim(),
        priceCents: Math.round(priceValue * 100),
        currency: "PKR",
        category: (manualCategory || undefined) as "physical" | "digital" | undefined,
      });
      onProductAdded(product);
      setManualName("");
      setManualPrice("");
      setManualCategory("");
    } catch (err) {
      setManualError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setManualSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === "catalog" && !catalog) loadCatalog(); }}>
          <TabsList className="w-full">
            <TabsTrigger value="url" className="flex-1">Paste a Shopify link</TabsTrigger>
            <TabsTrigger value="catalog" className="flex-1">Browse Shopify catalog</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Enter manually</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-3 pt-4">
            {urlError && <Alert variant="error">{urlError}</Alert>}
            <Label htmlFor="add-product-url" required>Shopify product URL</Label>
            <div className="flex gap-2">
              <Input
                id="add-product-url"
                type="url"
                placeholder="https://yourstore.myshopify.com/products/glow-serum"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="button" onClick={handleUrlSubmit} loading={urlSubmitting} disabled={!productUrl.trim()}>
                <Search className="h-4 w-4" aria-hidden="true" />
                Fetch
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="space-y-3 pt-4">
            {catalogNotConnected ? (
              <Alert variant="info">
                Connect your Shopify Admin API first — see Settings → Shopify connection.
              </Alert>
            ) : catalogError ? (
              <Alert variant="error">{catalogError}</Alert>
            ) : !catalog ? (
              <p className="text-sm text-muted-foreground">Loading your catalog…</p>
            ) : catalog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products found in your Shopify store.</p>
            ) : (
              <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto">
                {catalog.map((item) => (
                  <button
                    key={item.shopifyVariantId}
                    type="button"
                    onClick={() => handleCatalogPick(item)}
                    disabled={importingVariantId !== null}
                    className="space-y-2 rounded-[var(--radius-sm)] border border-border p-3 text-left hover:border-foreground disabled:opacity-50"
                  >
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- external Shopify CDN URL
                      <img src={item.imageUrl} alt="" className="h-20 w-full rounded object-cover" />
                    )}
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.currency} {(item.priceCents / 100).toFixed(2)}
                    </p>
                    {importingVariantId === item.shopifyVariantId && (
                      <p className="text-xs text-muted-foreground">Adding…</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 pt-4">
            {manualError && <Alert variant="error">{manualError}</Alert>}
            <div className="space-y-1.5">
              <Label htmlFor="manual-name" required>Product name</Label>
              <Input id="manual-name" value={manualName} onChange={(e) => setManualName(e.target.value)} invalid={Boolean(manualErrors.name)} />
              {manualErrors.name && <FormErrorText id="manual-name-error">{manualErrors.name}</FormErrorText>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-price" required>Price (PKR)</Label>
              <Input id="manual-price" type="number" min={0} value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} invalid={Boolean(manualErrors.price)} />
              {manualErrors.price && <FormErrorText id="manual-price-error">{manualErrors.price}</FormErrorText>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-category">Category</Label>
              <Select id="manual-category" value={manualCategory} onChange={(e) => setManualCategory(e.target.value)}>
                <option value="">Select one</option>
                {OFFER_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
            </div>
            <Button type="button" className="w-full" onClick={handleManualSubmit} loading={manualSubmitting}>
              Add product
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

Note: `manualCategory` above reuses `OFFER_CATEGORIES` (business verticals like "Beauty", "Fashion") as a placeholder options source — cross-check against the spec's actual `category: "physical"|"digital"` type on `ProductRead` before finalizing; if `category` on Product is strictly physical/digital (matching the type above), swap this `Select` for the same physical/digital `RadioGroup` pattern `real-new-offer-view.tsx` already uses, not `OFFER_CATEGORIES`. Flagged here rather than silently guessed — confirm against a real `POST /products` call during Step 2 below.

- [ ] **Step 2: Verify**

`npx tsc --noEmit` clean. Manually: open Products page (empty state), click "Add your first product," test all 3 tabs against the real Render backend — paste a real Shopify product URL (Tab A), attempt Tab B without a Shopify Admin connection (should show the "connect first" message via the 409), and submit Tab C manually. Confirm the category field question from Step 1's note against the real 422 response if you send the wrong shape.

- [ ] **Step 3: Commit**

```bash
git add src/app/merchant/products/add-product-dialog.tsx
git commit -m "feat(merchant): add Product dialog (URL import / catalog browse / manual entry)"
```

---

### Task 5: `real-store.ts` — Offer field additions + `updateOffer`

**Files:**
- Modify: `src/lib/merchant/real-store.ts`

**Interfaces:**
- Produces: extended `CreateRealOfferInput`, new `UpdateRealOfferInput`, `updateOffer(offerId, input)`. Consumed by Task 6 (`OfferForm`, both create and edit modes).

- [ ] **Step 1: Extend `CreateRealOfferInput`**

```ts
export type CustomerDiscountType = "percentage" | "fixed_amount";

export interface CreateRealOfferInput {
  name: string;
  priceCents: number;
  currency: string;
  category: "physical" | "digital";
  commissionRate: number;
  productUrl: string;
  imageUrl?: string;
  productId: string;
  customerDiscountType?: CustomerDiscountType;
  customerDiscountValue?: number;
  productProvided?: boolean;
  productReturnRequired?: boolean;
  returnWindowDays?: number;
  eligibilityRules?: Record<string, unknown>;
  marketingResources?: Record<string, unknown>;
}
```

(`commissionType` deliberately omitted per the spec's own instruction: "don't build a picker, just omit or send this" — never send it from the frontend.)

- [ ] **Step 2: Add `UpdateRealOfferInput` + `updateOffer`**

```ts
/** Every field optional — PATCH semantics: omitted key = unchanged, explicit `null` on a
 *  nullable field clears it. Used only for `status === "draft"` offers (409 OFFER_NOT_DRAFT
 *  otherwise) — Task 11's Edit button is the only caller and already gates on that client-side. */
export type UpdateRealOfferInput = Partial<Omit<CreateRealOfferInput, "productId">> & {
  productId?: string;
};

export async function updateOffer(offerId: string, input: UpdateRealOfferInput): Promise<RealOffer> {
  return apiRequest<RealOffer>(`/offers/${offerId}`, { method: "PATCH", body: input });
}
```

- [ ] **Step 3: Verify**

`npx tsc --noEmit` — will show errors at `real-new-offer-view.tsx`'s current `createOffer(...)` call site if it's missing any newly-required... no, all new fields are optional, so this should stay clean. Confirm it does.

- [ ] **Step 4: Commit**

```bash
git add src/lib/merchant/real-store.ts
git commit -m "feat(merchant): add discount/fulfillment offer fields + updateOffer"
```

---

### Task 6: Shared `OfferForm` component (product picker + fields + discount/fulfillment sections)

**Files:**
- Create: `src/app/merchant/offers/new/offer-form.tsx`

**Interfaces:**
- Consumes: `listProducts`, `ProductRead`, `createOffer`, `updateOffer`, `CreateRealOfferInput`, `RealOffer` (Task 1, 5), `Switch` (Task 0).
- Produces: `OfferForm` component, props:
  ```ts
  interface OfferFormProps {
    mode: "create" | "edit";
    initialOffer?: RealOffer; // required when mode === "edit"
    onSaved: (offer: RealOffer) => void;
  }
  ```
  Consumed by Task 7 (`real-new-offer-view.tsx`, `mode="create"`) and Task 11 (`real-edit-offer-view.tsx`, `mode="edit"`).

- [ ] **Step 1: Write the component**

This is the most involved piece — it merges the existing `real-new-offer-view.tsx` field patterns (name/price/commission/category, error handling, `ApiError` fallback message) with a new product-picker step in front, and two new collapsible sections below commission. Fulfillment validation mirrors the spec's client-side rules exactly (`INVALID_FULFILLMENT_CONFIG` avoidance).

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { RadioGroup } from "@/components/onboarding/radio-group";
import { Switch } from "@/components/ui/switch";
import { MIN_COMMISSION, MAX_COMMISSION } from "@/lib/merchant/constants";
import {
  listProducts,
  createOffer,
  updateOffer,
  type ProductRead,
  type RealOffer,
  type CustomerDiscountType,
} from "@/lib/merchant/real-store";
import { ApiError } from "@/lib/api";

const PRODUCT_TYPES = [
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
];

interface OfferFormProps {
  mode: "create" | "edit";
  initialOffer?: RealOffer;
  onSaved: (offer: RealOffer) => void;
}

export function OfferForm({ mode, initialOffer, onSaved }: OfferFormProps) {
  const [products, setProducts] = useState<ProductRead[] | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductRead | null>(null);

  const [name, setName] = useState(initialOffer?.name ?? "");
  const [price, setPrice] = useState(initialOffer ? String(initialOffer.priceCents / 100) : "");
  const [imageUrl, setImageUrl] = useState<string | null>(initialOffer?.imageUrl ?? null);
  const [category, setCategory] = useState<"physical" | "digital" | "">(initialOffer?.category ?? "");
  const [commissionRate, setCommissionRate] = useState(initialOffer ? String(initialOffer.commissionRate) : "");

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<CustomerDiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");

  const [productProvided, setProductProvided] = useState(false);
  const [productReturnRequired, setProductReturnRequired] = useState(false);
  const [returnWindowDays, setReturnWindowDays] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  function handleSelectProduct(product: ProductRead) {
    setSelectedProduct(product);
    setName(product.name);
    setPrice(String(product.priceCents / 100));
    setImageUrl(product.imageUrl);
    if (product.category) setCategory(product.category);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (mode === "create" && !selectedProduct) nextErrors.product = "Pick a product.";
    if (name.trim().length < 2) nextErrors.name = "Enter a product name.";
    const priceValue = Number(price);
    if (!price.trim() || Number.isNaN(priceValue) || priceValue <= 0) nextErrors.price = "Enter a price above 0.";
    if (!category) nextErrors.category = "Choose a product type.";
    const commission = Number(commissionRate);
    if (!commissionRate.trim() || Number.isNaN(commission) || commission <= 0) nextErrors.commissionRate = "Enter a commission rate.";

    if (discountEnabled) {
      const discountNum = Number(discountValue);
      if (!discountValue.trim() || Number.isNaN(discountNum) || discountNum <= 0) {
        nextErrors.discountValue = "Enter a discount value above 0.";
      }
    }

    // Mirrors the backend's INVALID_FULFILLMENT_CONFIG rule client-side.
    let returnWindowNum: number | undefined;
    if (productProvided && productReturnRequired) {
      returnWindowNum = Number(returnWindowDays);
      if (!returnWindowDays.trim() || Number.isNaN(returnWindowNum) || returnWindowNum <= 0) {
        nextErrors.returnWindowDays = "Enter a return window above 0 days.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);

    const basePayload = {
      name: name.trim(),
      priceCents: Math.round(priceValue * 100),
      currency: "PKR",
      category: category as "physical" | "digital",
      commissionRate: commission,
      productUrl: selectedProduct?.productUrl ?? initialOffer?.productUrl ?? "",
      imageUrl: imageUrl ?? undefined,
      customerDiscountType: discountEnabled ? discountType : undefined,
      customerDiscountValue: discountEnabled ? Number(discountValue) : undefined,
      productProvided: productProvided || undefined,
      productReturnRequired: productProvided ? productReturnRequired : undefined,
      returnWindowDays: returnWindowNum,
    };

    try {
      const offer =
        mode === "create"
          ? await createOffer({ ...basePayload, productId: selectedProduct!.id })
          : await updateOffer(initialOffer!.id, basePayload);
      onSaved(offer);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredProducts = products?.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase())) ?? [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {submitError && <Alert variant="error">{submitError}</Alert>}

      {mode === "create" && (
        <Card className="space-y-3 p-4">
          <Label required>Product</Label>
          {products === null ? (
            <p className="text-sm text-muted-foreground">Loading your products…</p>
          ) : products.length === 0 ? (
            <Alert variant="info">
              You don't have any products yet. <a href="/merchant/products" className="underline">Add one first</a>.
            </Alert>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input placeholder="Search your products…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className={`rounded-[var(--radius-sm)] border p-2 text-left text-sm ${selectedProduct?.id === p.id ? "border-foreground" : "border-border"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {errors.product && <FormErrorText id="product-error">{errors.product}</FormErrorText>}
            </>
          )}
        </Card>
      )}

      <Card className="space-y-5 p-6">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- external CDN URL
          <img src={imageUrl} alt="" className="h-40 w-full rounded-[var(--radius-sm)] border border-border object-cover" />
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name" required>Product name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} invalid={Boolean(errors.name)} />
          {errors.name && <FormErrorText id="name-error">{errors.name}</FormErrorText>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price" required>Price (PKR)</Label>
            <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} invalid={Boolean(errors.price)} />
            {errors.price && <FormErrorText id="price-error">{errors.price}</FormErrorText>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="commissionRate" required>Commission (%)</Label>
            <Input id="commissionRate" type="number" min={MIN_COMMISSION} max={MAX_COMMISSION} value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} invalid={Boolean(errors.commissionRate)} />
            {errors.commissionRate && <FormErrorText id="commissionRate-error">{errors.commissionRate}</FormErrorText>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label required>Product type</Label>
          <RadioGroup name="category" columns={2} value={category} onChange={(v) => setCategory(v as "physical" | "digital")} options={PRODUCT_TYPES} />
          {errors.category && <FormErrorText id="category-error">{errors.category}</FormErrorText>}
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="discount-toggle">Customer discount</Label>
          <Switch id="discount-toggle" checked={discountEnabled} onCheckedChange={setDiscountEnabled} />
        </div>
        {discountEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="discount-type">Type</Label>
              <RadioGroup
                name="discountType"
                columns={2}
                value={discountType}
                onChange={(v) => setDiscountType(v as CustomerDiscountType)}
                options={[{ value: "percentage", label: "Percent" }, { value: "fixed_amount", label: "Fixed" }]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount-value" required>Value</Label>
              <Input id="discount-value" type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} invalid={Boolean(errors.discountValue)} />
              {errors.discountValue && <FormErrorText id="discount-value-error">{errors.discountValue}</FormErrorText>}
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="fulfillment-toggle">I'll provide a free product</Label>
          <Switch id="fulfillment-toggle" checked={productProvided} onCheckedChange={(v) => { setProductProvided(v); if (!v) { setProductReturnRequired(false); setReturnWindowDays(""); } }} />
        </div>
        {productProvided && (
          <div className="flex items-center justify-between">
            <Label htmlFor="return-toggle">Creator must return it</Label>
            <Switch id="return-toggle" checked={productReturnRequired} onCheckedChange={(v) => { setProductReturnRequired(v); if (!v) setReturnWindowDays(""); }} />
          </div>
        )}
        {productProvided && productReturnRequired && (
          <div className="space-y-1.5">
            <Label htmlFor="return-window" required>Return window (days)</Label>
            <Input id="return-window" type="number" min={1} value={returnWindowDays} onChange={(e) => setReturnWindowDays(e.target.value)} invalid={Boolean(errors.returnWindowDays)} />
            {errors.returnWindowDays && <FormErrorText id="return-window-error">{errors.returnWindowDays}</FormErrorText>}
          </div>
        )}
      </Card>

      <Button type="submit" className="w-full" loading={submitting}>
        {mode === "create" ? "Save offer" : "Save changes"}
      </Button>
    </form>
  );
}
```

Note: `eligibilityRules`/`marketingResources` are deliberately **not** in this form per the spec's own "lower priority, can ship later" note — omitted entirely (`undefined`, never sent), not stubbed with a placeholder UI. Add a plain JSON textarea for them as a follow-up task if/when actually requested.

- [ ] **Step 2: Verify**

`npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/merchant/offers/new/offer-form.tsx
git commit -m "feat(merchant): add shared OfferForm (product picker, discount, fulfillment)"
```

---

### Task 7: Rework `real-new-offer-view.tsx` to use `OfferForm`

**Files:**
- Modify: `src/app/merchant/offers/new/real-new-offer-view.tsx`

**Interfaces:**
- Consumes: `OfferForm` (Task 6).

- [ ] **Step 1: Replace the whole body**

This file currently does its own product-import-at-submit-time logic (`importProduct`/`createProduct` fallback, added earlier this session before Products existed as a standalone concept). That logic is now redundant — product selection happens up front via `OfferForm`'s picker (Task 6), backed by the Products page (Task 3). Replace the entire component:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { OfferForm } from "./offer-form";
import { setOfferStatus } from "@/lib/merchant/real-store";

/** Real-mode create flow — thin wrapper around the shared OfferForm (create mode). Product
 *  selection now happens inside OfferForm itself (backed by the Products page/catalog), not
 *  here — see OfferForm's own doc comment for why the old import-at-submit-time fallback logic
 *  was removed (superseded by the Products-first backend contract). */
export function RealNewOfferView() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Create offer</h1>
        <p className="text-sm text-muted-foreground">Creators will see this listing once published.</p>
      </div>
      <OfferForm
        mode="create"
        onSaved={async (offer) => {
          const published = await setOfferStatus(offer.id, "live");
          router.push(`/merchant/offers/${published.id}?justCreated=1`);
        }}
      />
    </div>
  );
}
```

Check `src/app/merchant/offers/new/page.tsx` — it currently passes `email={session.email}` to `RealNewOfferView`. `email` was only used previously for the onboarding-record category default (`getOnboardingRecord(email)?.merchant?.productType`) — that convenience default is dropped along with the old freehand-entry flow (category now comes from the picked Product, or the merchant's own explicit radio choice, same as before but without the onboarding-record prefill). Update `page.tsx` to stop passing `email` if `RealNewOfferView` no longer accepts it — check that prop is actually unused after this change, don't leave a dangling unused prop type.

- [ ] **Step 2: Verify**

`npx tsc --noEmit` clean. Manually: with the real backend, go to Products (add one if needed), then Offers → New, confirm the product picker lists it, selecting it fills name/price/image, submit creates + publishes an offer successfully (check the network tab: `POST /offers` body includes `productId`).

- [ ] **Step 3: Commit**

```bash
git add src/app/merchant/offers/new/real-new-offer-view.tsx src/app/merchant/offers/new/page.tsx
git commit -m "refactor(merchant): rework offer creation to use shared OfferForm + product picker"
```

---

### Task 8: `real-store.ts` — Shopify Admin connection API

**Files:**
- Modify: `src/lib/merchant/real-store.ts`

**Interfaces:**
- Produces: `ShopifyAdminConnectionState`, `getShopifyAdminConnection()`, `connectShopifyAdmin(accessToken)`, `disconnectShopifyAdmin()`. Consumed by Task 9.

- [ ] **Step 1: Add the types + functions**

```ts
export type ShopifyAdminConnectionStatus = "needs_admin_token" | "connected" | "revoked";

export interface ShopifyAdminConnectionState {
  shopDomain: string | null;
  status: ShopifyAdminConnectionStatus;
  connected: boolean;
}

export async function getShopifyAdminConnection(): Promise<ShopifyAdminConnectionState> {
  return apiRequest<ShopifyAdminConnectionState>("/users/merchant-profile/shopify-admin-connection");
}

/** 422 SHOPIFY_DOMAIN_NOT_CONNECTED surfaces via the thrown ApiError — caller (Task 9) points
 *  the merchant at the existing shop-domain connect flow (onboarding's store-connect, also
 *  surfaced read-only on Settings per Task 9's own doc comment) when this code is seen. */
export async function connectShopifyAdmin(accessToken: string): Promise<ShopifyAdminConnectionState> {
  return apiRequest<ShopifyAdminConnectionState>("/users/merchant-profile/shopify-admin-connection", {
    method: "POST",
    body: { accessToken },
  });
}

export async function disconnectShopifyAdmin(): Promise<ShopifyAdminConnectionState> {
  return apiRequest<ShopifyAdminConnectionState>("/users/merchant-profile/shopify-admin-connection", {
    method: "DELETE",
  });
}
```

- [ ] **Step 2: Verify**

`npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/merchant/real-store.ts
git commit -m "feat(merchant): add Shopify Admin connection API"
```

---

### Task 9: Settings → Shopify connection page (existing shop-domain status + new Admin token card)

**Files:**
- Create: `src/app/merchant/settings/shopify/page.tsx`
- Create: `src/app/merchant/settings/shopify/shopify-settings-view.tsx`

**Interfaces:**
- Consumes: `getShopifyAdminConnection`, `connectShopifyAdmin`, `disconnectShopifyAdmin` (Task 8). Also reads the **existing** shop-domain connection endpoint directly (`GET /users/merchant-profile/shopify-connection`, already used by `src/app/onboarding/store-connect/store-connect-view.tsx` — that file's local `ShopifyConnectionState` interface isn't exported; redeclare the same shape here rather than importing a non-exported type across files).

- [ ] **Step 1: `page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { ShopifySettingsView } from "./shopify-settings-view";

export const metadata = { title: "Shopify connection" };

export default async function ShopifySettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <ShopifySettingsView />;
}
```

- [ ] **Step 2: `shopify-settings-view.tsx`**

Mirror `src/app/merchant/settings/security/security-settings-view.tsx`'s (or `billing-settings-view.tsx`'s) back-link + Card layout convention. The shop-domain half is **read-only status display only** — the spec's actual editable shop-domain flow already lives in onboarding; duplicating that full editable form here isn't in scope, only surfacing its current status so the new Admin token card has something to sit "next to," with a link out to the real flow if not connected.

```tsx
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/reference/ui/card";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { StatusBadge } from "@/components/reference/ui/status-badge";
import {
  getShopifyAdminConnection,
  connectShopifyAdmin,
  disconnectShopifyAdmin,
  type ShopifyAdminConnectionState,
} from "@/lib/merchant/real-store";
import { apiRequest, ApiError } from "@/lib/api";

interface ShopDomainState {
  shopDomain: string | null;
  connected: boolean;
}

export function ShopifySettingsView() {
  const [domainState, setDomainState] = useState<ShopDomainState | null>(null);
  const [adminState, setAdminState] = useState<ShopifyAdminConnectionState | null>(null);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setDomainState(await apiRequest<ShopDomainState>("/users/merchant-profile/shopify-connection"));
    } catch {
      setDomainState({ shopDomain: null, connected: false });
    }
    try {
      setAdminState(await getShopifyAdminConnection());
    } catch {
      setAdminState({ shopDomain: null, status: "needs_admin_token", connected: false });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const domainConnected = domainState?.connected ?? false;

  async function handleConnect() {
    if (!token.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const state = await connectShopifyAdmin(token.trim());
      setAdminState(state);
      setToken("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "SHOPIFY_DOMAIN_NOT_CONNECTED") {
        setError("Connect your store domain first — see the Shopify domain section above.");
      } else {
        setError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setSubmitting(true);
    setError(null);
    try {
      setAdminState(await disconnectShopifyAdmin());
    } catch (err) {
      setError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/merchant/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Settings
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Shopify connection</h1>
      </div>

      <Card className="space-y-2 p-6">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Store domain</p>
          <StatusBadge tone={domainConnected ? "success" : "neutral"}>
            {domainConnected ? "Connected" : "Not connected"}
          </StatusBadge>
        </div>
        {domainState?.shopDomain && <p className="text-sm text-muted-foreground">{domainState.shopDomain}</p>}
        {!domainConnected && (
          <Link href="/onboarding/store-connect" className="text-xs text-accent-foreground underline underline-offset-2">
            Connect your store domain
          </Link>
        )}
      </Card>

      <Card className={`space-y-3 p-6 ${!domainConnected ? "opacity-50" : ""}`} title={!domainConnected ? "Connect your store domain first" : undefined}>
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Shopify Admin API</p>
          <StatusBadge tone={adminState?.status === "connected" ? "success" : adminState?.status === "revoked" ? "warning" : "neutral"}>
            {adminState?.status === "connected" ? "Connected" : adminState?.status === "revoked" ? "Revoked" : "Not connected"}
          </StatusBadge>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <p className="text-xs text-muted-foreground">
          Go to your Shopify Admin → Settings → Apps → Develop apps, create an app, grant
          write_discounts + read_orders, then paste the generated Admin API access token here.
        </p>

        {adminState?.status === "connected" ? (
          <Button type="button" variant="secondary" onClick={handleDisconnect} loading={submitting} disabled={!domainConnected}>
            Disconnect
          </Button>
        ) : (
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="shpat_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1"
              disabled={!domainConnected}
            />
            <Button type="button" onClick={handleConnect} loading={submitting} disabled={!domainConnected || !token.trim()}>
              Connect
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Add the Settings hub entry**

In `src/app/merchant/settings/page.tsx`'s `SECTIONS` array, add:

```ts
{ href: "/merchant/settings/shopify", icon: ShoppingBag, title: "Shopify connection", description: "Connect your store domain and Admin API." },
```

(Import `ShoppingBag` from `lucide-react` alongside the existing `Building2`/`CreditCard`/`ShieldCheck` icons.)

- [ ] **Step 4: Verify**

`npx tsc --noEmit` clean. Manually: visit Settings, confirm the new "Shopify connection" row appears, click through, confirm the Admin token card is grayed out if store domain isn't connected, and that connecting/disconnecting a token round-trips against the real backend.

- [ ] **Step 5: Commit**

```bash
git add src/app/merchant/settings/page.tsx src/app/merchant/settings/shopify
git commit -m "feat(merchant): add Shopify Admin connection card to Settings"
```

---

### Task 10: Merchant sidebar/Settings — no separate task

Covered by Task 9 Step 3 (Settings hub entry). No standalone nav-rail entry needed — Shopify connection lives inside the existing Settings hub pattern like Business profile/Billing/Security already do.

---

### Task 11: Offer edit (draft-only)

**Files:**
- Create: `src/app/merchant/offers/[id]/edit/real-edit-offer-view.tsx`
- Modify or create: `src/app/merchant/offers/[id]/edit/page.tsx` — **check first**: the codebase survey found this route already exists for mock mode (`edit-offer-view.tsx` sibling). Read that existing `page.tsx` before touching it; if it already branches on `isMockMode` the way `src/app/merchant/offers/new/page.tsx` does, add the real-mode branch there rather than overwriting the mock one.
- Modify: `src/app/merchant/offers/real-offers-view.tsx` — Edit button/link on draft rows.
- Modify: `src/app/merchant/offers/[id]/real-offer-detail-view.tsx` — Edit button/link when `status === "draft"`, and fix the stale doc comment.

**Interfaces:**
- Consumes: `OfferForm` (Task 6, `mode="edit"`), `getOffer` (existing).

- [ ] **Step 1: Fix the stale doc comment first**

In `real-offer-detail-view.tsx`, find the comment claiming "No Edit action — offers have no real edit endpoint at all (deliberate; see API-ENDPOINTS.md's 'Known Gaps')". That's now false — `PATCH /offers/{id}` exists for draft offers per this spec. Replace it with something accurate, e.g.: "Edit is available only while `status === 'draft'` (`PATCH /offers/{id}`, 409 OFFER_NOT_DRAFT otherwise) — see offer-form.tsx's edit mode."

- [ ] **Step 2: `real-edit-offer-view.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { OfferForm } from "../../new/offer-form";
import type { RealOffer } from "@/lib/merchant/real-store";

export function RealEditOfferView({ offer }: { offer: RealOffer }) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Edit offer</h1>
      </div>
      <OfferForm
        mode="edit"
        initialOffer={offer}
        onSaved={(updated) => router.push(`/merchant/offers/${updated.id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 3: `page.tsx`** (real-mode branch — check existing file first per the note above; this is the shape to add/merge, not necessarily a full overwrite)

```tsx
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { getOffer } from "@/lib/merchant/real-store";
import { ApiError } from "@/lib/api";
import { RealEditOfferView } from "./real-edit-offer-view";

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const { id } = await params;
  try {
    const offer = await getOffer(id);
    if (offer.status !== "draft") redirect(`/merchant/offers/${id}`);
    return <RealEditOfferView offer={offer} />;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}
```

(Server-side `getOffer` here needs a request-scoped auth token, not the client-only `authTokenProvider` — check whether `real-store.ts`'s `getOffer` needs an `authToken` override for server-side use, same pattern `lib/auth/clerk/server-api-token.ts`'s doc comment describes. If `getOffer` doesn't currently accept `ApiRequestOptions`, either add an optional param or do this fetch client-side instead inside `RealEditOfferView` via a `useEffect` — pick whichever this file's sibling `page.tsx`s already do elsewhere in `[id]` routes; check `src/app/merchant/offers/[id]/page.tsx` for the existing pattern before deciding.)

- [ ] **Step 4: Edit button — offer list (`real-offers-view.tsx`) and detail (`real-offer-detail-view.tsx`)**

In both files' draft-status conditional block (next to the existing Publish button), add:

```tsx
{offer.status === "draft" && (
  <Link href={`/merchant/offers/${offer.id}/edit`}>
    <Button type="button" variant="secondary">Edit</Button>
  </Link>
)}
```

Since both files currently duplicate the same status-action JSX (per the survey), consider extracting a shared `<OfferStatusActions offer={offer} onStatusChange={...} />` component here rather than pasting Edit into both independently — worth doing if editing both files in the same sitting makes the duplication obvious; not required if time-constrained (note as a `ponytail:` follow-up if skipped: `# ponytail: Edit/Publish/Pause JSX duplicated between real-offers-view.tsx and real-offer-detail-view.tsx, extract OfferStatusActions if a third copy appears`).

- [ ] **Step 5: Verify**

`npx tsc --noEmit` clean. Manually: create a draft offer, confirm Edit appears on both list and detail views, confirm it disappears once published, confirm the edit form pre-fills and a partial change round-trips via `PATCH`.

- [ ] **Step 6: Commit**

```bash
git add src/app/merchant/offers
git commit -m "feat(merchant): add draft offer editing"
```

---

### Task 12: `real-store.ts` additions — Merchant/Creator profile "me" endpoints

**Files:**
- Modify: `src/lib/merchant/real-store.ts`
- Modify: `src/lib/creator/real-store.ts`

**Interfaces:**
- Produces: `MerchantProfileMe`, `getMerchantProfileMe()` / `CreatorProfileMe`, `getCreatorProfileMe()`. Consumed by Task 13/14.

- [ ] **Step 1: Merchant**

```ts
// src/lib/merchant/real-store.ts
export interface MerchantProfileMe {
  id: string;
  userId: string;
  businessName: string;
  category: string | null;
  businessCategory: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  name: string | null;
  avatarUrl: string | null;
  offersListedCount: number;
}

export async function getMerchantProfileMe(): Promise<MerchantProfileMe> {
  return apiRequest<MerchantProfileMe>("/users/merchant-profile/me");
}
```

- [ ] **Step 2: Creator**

```ts
// src/lib/creator/real-store.ts — add alongside existing exports, same apiRequest import already present
export interface CreatorProfileMe {
  id: string;
  userId: string;
  audienceSize: number;
  niche: string | null;
  engagementRate: number | null;
  platform: string | null;
  handle: string | null;
  createdAt: string;
  updatedAt: string;
  name: string | null;
  avatarUrl: string | null;
  offersJoinedCount: number;
}

export async function getCreatorProfileMe(): Promise<CreatorProfileMe> {
  return apiRequest<CreatorProfileMe>("/users/creator-profile/me");
}
```

- [ ] **Step 3: Verify**

`npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/merchant/real-store.ts src/lib/creator/real-store.ts
git commit -m "feat: add merchant/creator profile 'me' API functions"
```

---

### Task 13: Merchant profile page

**Files:**
- Create: `src/app/merchant/profile/page.tsx`
- Create: `src/app/merchant/profile/merchant-profile-view.tsx`
- Modify: `src/components/merchant/sidebar.tsx` — add Profile nav entry.

**Interfaces:**
- Consumes: `getMerchantProfileMe` (Task 12), `Avatar`/`AvatarImage`/`AvatarFallback` (`@/components/ui/avatar`).

- [ ] **Step 1: `page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { MerchantProfileView } from "./merchant-profile-view";

export const metadata = { title: "Profile" };

export default async function MerchantProfilePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <MerchantProfileView />;
}
```

- [ ] **Step 2: `merchant-profile-view.tsx`**

```tsx
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
```

- [ ] **Step 3: Nav entry**

In `src/components/merchant/sidebar.tsx`'s `NAV_ITEMS` (already touched in Task 2 for Products), add Profile — pick a placement (e.g. right after Billing, or grouped near Settings at the bottom is arguably more fitting since it's account-identity, not a workflow item; use judgment matching how Settings is already bottom-pinned separately from `NAV_ITEMS` — Profile could reasonably follow that same bottom-pinned pattern rather than going in `NAV_ITEMS` at all. Decide based on what looks right once Products (Task 2) is already in there — don't force it into the array if a bottom-pinned link next to Settings reads better).

- [ ] **Step 4: Verify**

`npx tsc --noEmit` clean. Manually confirm against the real backend: avatar renders (or falls back to initials when `avatarUrl` is `null`), `offersListedCount` shows a real number.

- [ ] **Step 5: Commit**

```bash
git add src/app/merchant/profile src/components/merchant/sidebar.tsx
git commit -m "feat(merchant): add profile page"
```

---

### Task 14: Creator profile page

**Files:**
- Create: `src/app/creator/profile/page.tsx`
- Create: `src/app/creator/profile/creator-profile-view.tsx`
- Modify: `src/components/creator/sidebar.tsx` — add Profile nav entry (mirror whatever pattern Task 13 lands on for merchant).

**Interfaces:**
- Consumes: `getCreatorProfileMe` (Task 12).

- [ ] **Step 1–3:** Same structure as Task 13, swapping `getMerchantProfileMe`→`getCreatorProfileMe`, `businessName`→`handle`/`niche`/`platform`/`audienceSize`/`engagementRate`, `offersListedCount`→`offersJoinedCount`. Read `src/components/creator/sidebar.tsx` first (not yet read in this session's survey) to confirm it follows the same `NAV_ITEMS`-array-vs-bottom-pinned-Settings structure as merchant's before deciding placement — don't assume identical structure without checking.

- [ ] **Step 4: Verify**

`npx tsc --noEmit` clean. Manual check against real backend as a creator account.

- [ ] **Step 5: Commit**

```bash
git add src/app/creator/profile src/components/creator/sidebar.tsx
git commit -m "feat(creator): add profile page"
```

---

## Self-Review Notes (per writing-plans skill)

**Spec coverage:** Section 1 → Tasks 1–4. Section 2 → Tasks 8–9. Section 3 → Tasks 5–7. Section 4 → Task 11. Section 5 → already shipped, no task. Section 6 → Task 13 (+ shared Task 12). Section 7 → Task 14 (+ shared Task 12). Task 0 is infrastructure (Switch) needed by Task 6. All 7 sections covered.

**Known open items carried into task steps rather than resolved here** (each flagged inline at its exact decision point, not glossed over):
1. Task 4 Step 1 — `ProductRead.category` type (`physical`/`digital`) vs. the manual-entry dialog's category picker needs a real-request confirmation, not a guess.
2. Task 9 — the Settings "shop domain" card is a new *read-only* surface reusing an existing endpoint, not a duplicate of onboarding's full editable flow — deliberate scope limit, confirm it's acceptable before or during Task 9.
3. Task 11 Step 3 — whether `getOffer` needs server-side `authToken` plumbing or should move client-side depends on a sibling file (`offers/[id]/page.tsx`) this plan didn't read; check before writing that file.
4. Task 13 Step 3 / Task 14 — exact nav placement (top-level vs. Settings-adjacent bottom-pinned) is left as a judgment call at execution time, not prescribed rigidly, since it's a cosmetic decision with no functional stakes.

**Placeholder scan:** no "TBD"/"handle appropriately" left in any code step; every code block is complete, runnable TypeScript/TSX against real, named types.
