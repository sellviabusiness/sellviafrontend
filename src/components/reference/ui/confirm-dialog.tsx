"use client";

import { useEffect } from "react";
import { Button } from "./button";
import { Card } from "./card";

/** Generic confirm modal — destructive actions (delete campaign, etc.) route through this
 *  instead of a native confirm(), matching the rest of the app's dark/lime styling. Reusable
 *  wherever else a "this can't be undone" prompt is needed. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <Card
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-5 flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "secondary" : "primary"}
            onClick={onConfirm}
            className={destructive ? "border-danger-border text-danger hover:bg-danger-bg" : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
