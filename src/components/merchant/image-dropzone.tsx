"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Product image upload — visual only, no real storage backend yet (kept as a data URL in the
 * mock Campaign record, same "frontend-ready, backend seam later" approach as Playbook 02's KYC
 * upload before it). Click-to-upload and drag-drop both work.
 */
export function ImageDropzone({
  value,
  onChange,
  errorText,
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  errorText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | undefined>(errorText);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Use a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5MB.");
      return;
    }
    setError(undefined);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  if (value) {
    return (
      <div className="relative w-full overflow-hidden rounded-[var(--radius-sm)] border border-border">
        {/* Data-URL preview, not a remote asset — a plain <img> is correct here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Product preview" className="h-40 w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label="Remove image"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed text-center transition-colors",
          dragOver ? "border-accent bg-accent/5" : "border-border hover:border-border-hover",
        )}
      >
        <UploadCloud className="h-5 w-5 text-muted-foreground-2" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Drop an image or click to upload</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
