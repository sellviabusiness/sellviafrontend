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
  type CustomerDiscountType,
} from "@/lib/merchant/real-store";
// RealOffer is defined in types.ts and only imported (not re-exported) by real-store.ts — every
// other real-mode view (real-offers-view.tsx, real-offer-detail-view.tsx, ...) imports it from
// here directly rather than through real-store.ts, so this follows that same convention.
import type { RealOffer } from "@/lib/merchant/types";
import { ApiError } from "@/lib/api";

const PRODUCT_TYPES = [
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
];

interface OfferFormProps {
  mode: "create" | "edit";
  /** Required when mode === "edit" (Task 11's edit view always has the offer loaded before
   *  rendering this form). Note RealOffer carries no discount/fulfillment fields of its own
   *  (see types.ts) — those sections always start from their defaults, even in edit mode, since
   *  there's nothing on the offer read-shape to seed them from. */
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

    // Mirrors the backend's INVALID_FULFILLMENT_CONFIG rule client-side:
    //  - productProvided=false            -> productReturnRequired/returnWindowDays both unset
    //  - productProvided, !returnRequired -> returnWindowDays unset
    //  - productProvided, returnRequired  -> returnWindowDays a validated positive number
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
              You don&apos;t have any products yet. <a href="/merchant/products" className="underline">Add one first</a>.
            </Alert>
          ) : (
            <>
              <Input
                placeholder="Search your products…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                icon={<Search className="h-4 w-4" aria-hidden="true" />}
              />
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
          <Label htmlFor="fulfillment-toggle">I&apos;ll provide a free product</Label>
          <Switch
            id="fulfillment-toggle"
            checked={productProvided}
            onCheckedChange={(v) => {
              setProductProvided(v);
              if (!v) {
                setProductReturnRequired(false);
                setReturnWindowDays("");
              }
            }}
          />
        </div>
        {productProvided && (
          <div className="flex items-center justify-between">
            <Label htmlFor="return-toggle">Creator must return it</Label>
            <Switch
              id="return-toggle"
              checked={productReturnRequired}
              onCheckedChange={(v) => {
                setProductReturnRequired(v);
                if (!v) setReturnWindowDays("");
              }}
            />
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
