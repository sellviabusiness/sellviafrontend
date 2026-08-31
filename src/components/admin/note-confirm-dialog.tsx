"use client";

import { Card } from "@/components/reference/ui/card";
import { Button } from "@/components/reference/ui/button";
import { Textarea } from "@/components/reference/ui/textarea";

/** Shared confirm-with-optional-note modal — every G2/G3/G5/G6 admin write action needs "confirm
 *  + optional note", so this is the one shared shell rather than five near-identical copies. */
export function NoteConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  note,
  onNoteChange,
  noteLabel = "Optional note",
  confirmDisabled,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  noteLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <Card role="alertdialog" aria-modal="true" className="w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-3">
          <Textarea placeholder={noteLabel} value={note} onChange={(e) => onNoteChange(e.target.value)} rows={2} />
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "secondary" : "primary"}
            className={destructive ? "border-danger-border text-danger hover:bg-danger-bg" : undefined}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
