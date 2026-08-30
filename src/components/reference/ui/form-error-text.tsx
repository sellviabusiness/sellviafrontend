/** Inline field-level error text — paired with a field via `id`/`aria-describedby`. */
export function FormErrorText({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="text-sm text-danger">
      {children}
    </p>
  );
}
