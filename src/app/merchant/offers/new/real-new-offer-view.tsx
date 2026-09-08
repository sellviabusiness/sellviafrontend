"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Card } from "@/components/reference/ui/card";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Button } from "@/components/reference/ui/button";
import { Alert } from "@/components/reference/ui/alert";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { RadioGroup } from "@/components/onboarding/radio-group";
import { MIN_COMMISSION, MAX_COMMISSION } from "@/lib/merchant/constants";
import { prefillOffer, createOffer, setOfferStatus } from "@/lib/merchant/real-store";
import { ApiError } from "@/lib/api";

const PRODUCT_TYPES = [
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
];

/**
 * Real-mode create flow — deliberately a guided sequence rather than one flat form (see
 * offer-form.tsx's mock counterpart for the old single-form shape): paste a Shopify product URL
 * → SellVia fetches name/price/image automatically → merchant only has to set what nothing else
 * can know (category, commission) → submit does both real calls (create, then publish) back to
 * back, so it reads as one "Publish offer" action even though the real state machine is
 * create-then-separately-publish underneath. No description/shipping fields — neither has a real
 * backend field to land in (see RealOffer's own doc comment, types.ts).
 */
export function RealNewOfferView() {
  const router = useRouter();
  const [productUrl, setProductUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const [name, setName] = useState("");
  // PKR rupees, as typed/displayed — converted to priceCents only at the API boundary (fetch-in,
  // submit-out), same round-trip every other real-mode screen already does for OfferRead.priceCents.
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<"physical" | "digital" | "">("");
  const [commissionRate, setCommissionRate] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFetch() {
    if (!productUrl.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      const result = await prefillOffer(productUrl.trim());
      setName(result.name);
      setPrice(String(result.priceCents / 100));
      setImageUrl(result.imageUrl);
      setRevealed(true);
    } catch (err) {
      // Best-effort by design (backend's own PRODUCT_FETCH_FAILED doc comment: "never blocks
      // offer creation, the merchant just types fields manually on failure") — still reveal the
      // fields, just empty, rather than dead-ending the flow.
      setFetchError(err instanceof ApiError ? err.uiMessage : "Couldn't fetch product details — enter them manually.");
      setRevealed(true);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = "Enter a product name.";
    const priceValue = Number(price);
    if (!price.trim() || Number.isNaN(priceValue) || priceValue <= 0) nextErrors.price = "Enter a price above 0.";
    if (!category) nextErrors.category = "Choose a product type.";
    const commission = Number(commissionRate);
    if (!commissionRate.trim() || Number.isNaN(commission) || commission <= 0) {
      nextErrors.commissionRate = "Enter a commission rate.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const offer = await createOffer({
        name: name.trim(),
        priceCents: Math.round(priceValue * 100),
        currency: "PKR",
        category: category as "physical" | "digital",
        commissionRate: commission,
        productUrl: productUrl.trim(),
        // Persisted now (backend added imageUrl 2026-09-06) — previously fetched for display
        // only and never sent, since there was nowhere for it to land.
        imageUrl: imageUrl ?? undefined,
      });
      const published = await setOfferStatus(offer.id, "live");
      router.push(`/merchant/offers/${published.id}?justCreated=1`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.uiMessage : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">Create offer</h1>
        <p className="text-sm text-muted-foreground">Creators will see this listing once published.</p>
      </div>

      <Card className="space-y-5 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="productUrl" required>Shopify product URL</Label>
          <div className="flex gap-2">
            <Input
              id="productUrl"
              type="url"
              placeholder="https://yourstore.myshopify.com/products/glow-serum"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={handleFetch} loading={fetching} disabled={!productUrl.trim()}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Fetch details
            </Button>
          </div>
          {fetchError && <FormErrorText id="fetch-error">{fetchError}</FormErrorText>}
          {!revealed && (
            <button type="button" onClick={() => setRevealed(true)} className="text-xs text-accent-foreground underline underline-offset-2">
              Enter details manually instead
            </button>
          )}
        </div>

        {revealed && (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {submitError && <Alert variant="error">{submitError}</Alert>}

            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- external Shopify CDN URL, not a local asset next/image can optimize
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
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  invalid={Boolean(errors.price)}
                />
                {errors.price && <FormErrorText id="price-error">{errors.price}</FormErrorText>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="commissionRate" required>Commission (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min={MIN_COMMISSION}
                  max={MAX_COMMISSION}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  invalid={Boolean(errors.commissionRate)}
                />
                {errors.commissionRate && <FormErrorText id="commissionRate-error">{errors.commissionRate}</FormErrorText>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label required>Product type</Label>
              <RadioGroup name="category" columns={2} value={category} onChange={(v) => setCategory(v as "physical" | "digital")} options={PRODUCT_TYPES} />
              {errors.category && <FormErrorText id="category-error">{errors.category}</FormErrorText>}
            </div>

            <Button type="submit" className="w-full" loading={submitting}>
              Publish offer
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
