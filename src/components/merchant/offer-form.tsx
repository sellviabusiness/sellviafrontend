"use client";

import { useState, type FormEvent } from "react";
import { Label } from "@/components/reference/ui/label";
import { Input } from "@/components/reference/ui/input";
import { Select } from "@/components/reference/ui/select";
import { Textarea } from "@/components/reference/ui/textarea";
import { FormErrorText } from "@/components/reference/ui/form-error-text";
import { Button } from "@/components/reference/ui/button";
import { CopyAssistButton } from "@/components/ai/copy-assist-button";
import { ImageDropzone } from "./image-dropzone";
import { OFFER_CATEGORIES, MIN_COMMISSION, MAX_COMMISSION } from "@/lib/merchant/constants";
import type { NewOfferInput } from "@/lib/merchant/store";
import type { ProductType } from "@/lib/merchant/types";

export interface OfferFormValues {
  productName: string;
  price: string;
  commissionRate: string;
  category: string;
  productType: ProductType | "";
  description: string;
  imageDataUrl?: string;
  shippingWeightGrams: string;
  shippingNotes: string;
}

const EMPTY_VALUES: OfferFormValues = {
  productName: "",
  price: "",
  commissionRate: "",
  category: "",
  productType: "",
  description: "",
  imageDataUrl: undefined,
  shippingWeightGrams: "",
  shippingNotes: "",
};

/**
 * Shared create/edit form (D3). Renamed from CampaignForm — same field layout, plus:
 * - PKR pricing (no unit symbol in the input itself, Label/help text says PKR).
 * - Shipping fields (weight, notes) shown only for physical offers — hidden entirely, not just
 *   disabled, when productType is "digital".
 * - AI copy-assist on the description field (components/ai/copy-assist-button.tsx, reused as-is —
 *   calls the real /ai/copy-assist endpoint; degrades to an inline "couldn't draft that" message
 *   if unreachable, never fakes a draft).
 * - A two-gate publish checklist, required only on create (`requireChecklist`): both boxes must
 *   be checked before Publish enables. This is a UI-level stand-in for the real spec's
 *   snippet-verification + Paddle-billing server gates (Playbook 04 §2b) — not a real gate,
 *   flagged here and in store.ts's createOffer.
 */
export function OfferForm({
  initialValues = EMPTY_VALUES,
  commissionLocked,
  submitLabel,
  requireChecklist,
  onSubmit,
}: {
  initialValues?: OfferFormValues;
  commissionLocked?: boolean;
  submitLabel: string;
  requireChecklist?: boolean;
  onSubmit: (values: NewOfferInput) => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState({ details: false, pricing: false });

  function set<K extends keyof OfferFormValues>(key: K, value: OfferFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const isDigital = values.productType === "digital";
  const checklistSatisfied = !requireChecklist || (checklist.details && checklist.pricing);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (values.productName.trim().length < 2) nextErrors.productName = "Enter a product name.";
    const price = Number(values.price);
    if (!values.price.trim() || Number.isNaN(price) || price <= 0) nextErrors.price = "Enter a price above ₨0.";
    const commissionRate = Number(values.commissionRate);
    if (
      !values.commissionRate.trim() ||
      Number.isNaN(commissionRate) ||
      commissionRate < MIN_COMMISSION ||
      commissionRate > MAX_COMMISSION
    ) {
      nextErrors.commissionRate = `Enter a commission between ${MIN_COMMISSION}% and ${MAX_COMMISSION}%.`;
    }
    if (!values.category) nextErrors.category = "Choose a category.";
    if (!values.productType) nextErrors.productType = "Choose a product type.";
    if (values.description.trim().length < 10) nextErrors.description = "Add a short description (10+ characters).";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (!checklistSatisfied) return; // Publish button is disabled in this state too — belt and suspenders.

    setSubmitting(true);
    onSubmit({
      productName: values.productName.trim(),
      price,
      commissionRate,
      category: values.category,
      productType: values.productType as ProductType,
      description: values.description.trim(),
      imageDataUrl: values.imageDataUrl,
      ...(values.productType === "physical"
        ? {
            shippingWeightGrams: values.shippingWeightGrams.trim() ? Number(values.shippingWeightGrams) : undefined,
            shippingNotes: values.shippingNotes.trim() || undefined,
          }
        : {}),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="productName" required>Product name</Label>
        <Input
          id="productName"
          placeholder="Glow serum"
          value={values.productName}
          onChange={(e) => set("productName", e.target.value)}
          invalid={Boolean(errors.productName)}
        />
        {errors.productName && <FormErrorText id="productName-error">{errors.productName}</FormErrorText>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="price" required>Price (PKR)</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step="1"
            placeholder="₨2,900"
            value={values.price}
            onChange={(e) => set("price", e.target.value)}
            invalid={Boolean(errors.price)}
          />
          {errors.price && <FormErrorText id="price-error">{errors.price}</FormErrorText>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commissionRate" required>Commission</Label>
          <Input
            id="commissionRate"
            type="number"
            min={MIN_COMMISSION}
            max={MAX_COMMISSION}
            placeholder="20%"
            value={values.commissionRate}
            onChange={(e) => set("commissionRate", e.target.value)}
            invalid={Boolean(errors.commissionRate)}
            disabled={commissionLocked}
          />
          {commissionLocked ? (
            <p className="text-xs text-muted-foreground-2">Locked — this offer has an approved creator.</p>
          ) : (
            errors.commissionRate && <FormErrorText id="commissionRate-error">{errors.commissionRate}</FormErrorText>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="category" required>Category</Label>
          <Select
            id="category"
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            invalid={Boolean(errors.category)}
          >
            <option value="" disabled>Select one</option>
            {OFFER_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          {errors.category && <FormErrorText id="category-error">{errors.category}</FormErrorText>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="productType" required>Product type</Label>
          <Select
            id="productType"
            value={values.productType}
            onChange={(e) => set("productType", e.target.value as ProductType)}
            invalid={Boolean(errors.productType)}
          >
            <option value="" disabled>Select one</option>
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
          </Select>
          {errors.productType && <FormErrorText id="productType-error">{errors.productType}</FormErrorText>}
        </div>
      </div>

      {/* Shipping fields — physical offers only. Hidden entirely (not disabled) for digital. */}
      {values.productType === "physical" && (
        <div className="grid grid-cols-2 gap-4 rounded-[var(--radius-sm)] border border-border p-4">
          <div className="col-span-2 -mt-1 text-xs font-medium text-muted-foreground">Shipping</div>
          <div className="space-y-1.5">
            <Label htmlFor="shippingWeightGrams">Package weight (grams)</Label>
            <Input
              id="shippingWeightGrams"
              type="number"
              min={0}
              value={values.shippingWeightGrams}
              onChange={(e) => set("shippingWeightGrams", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shippingNotes">Shipping notes</Label>
            <Input
              id="shippingNotes"
              placeholder="Ships in 2–3 business days"
              value={values.shippingNotes}
              onChange={(e) => set("shippingNotes", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description" required>Description</Label>
          <CopyAssistButton
            context={{ field: "offer_description", prompt: `${values.productName || "this product"} — category: ${values.category || "general"}` }}
            onDraft={(text) => set("description", text)}
          />
        </div>
        <Textarea
          id="description"
          placeholder="A lightweight vitamin C serum for daily glow."
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          invalid={Boolean(errors.description)}
        />
        {errors.description && <FormErrorText id="description-error">{errors.description}</FormErrorText>}
      </div>

      <div className="space-y-1.5">
        <Label>Product image</Label>
        <ImageDropzone value={values.imageDataUrl} onChange={(v) => set("imageDataUrl", v)} />
      </div>

      {requireChecklist && (
        <div className="space-y-2 rounded-[var(--radius-sm)] border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">Before you publish</p>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={checklist.details}
              onChange={(e) => setChecklist((prev) => ({ ...prev, details: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded-sm border-border accent-[color:var(--color-accent)]"
            />
            Product details (name, category, description, image) are accurate.
          </label>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={checklist.pricing}
              onChange={(e) => setChecklist((prev) => ({ ...prev, pricing: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded-sm border-border accent-[color:var(--color-accent)]"
            />
            Price and commission rate are confirmed.
          </label>
        </div>
      )}

      <Button type="submit" className="w-full" loading={submitting} disabled={!checklistSatisfied}>
        {submitLabel}
      </Button>
      {isDigital && <p className="text-center text-xs text-muted-foreground-2">Digital offer — no shipping fields needed.</p>}
    </form>
  );
}
