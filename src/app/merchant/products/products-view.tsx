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
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.uiMessage : "Couldn't load your products.");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div role="status" aria-live="polite" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Loading…</span>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5" aria-hidden="true" />}
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
