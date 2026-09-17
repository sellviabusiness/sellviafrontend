"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { RadioGroup } from "@/components/onboarding/radio-group";
import {
  importProduct,
  importProductByShopifyVariant,
  createProduct,
  listShopifyCatalog,
  type ProductRead,
  type ShopifyCatalogItemRead,
} from "@/lib/merchant/real-store";
import { ApiError } from "@/lib/api";

// Product.category is physical/digital only (ProductRead's own type) — NOT the business-vertical
// OFFER_CATEGORIES list ("Beauty"/"Fashion"/…) offers use. Same picker real-new-offer-view.tsx
// uses for its own "Product type" field.
const PRODUCT_TYPES = [
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
];

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
  const [manualCategory, setManualCategory] = useState<"physical" | "digital" | "">("");
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
        category: manualCategory || undefined,
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
              <Label>Category</Label>
              <RadioGroup
                name="manual-category"
                columns={2}
                value={manualCategory}
                onChange={(v) => setManualCategory(v as "physical" | "digital")}
                options={PRODUCT_TYPES}
              />
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
