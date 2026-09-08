// Native <script> tag, not next/script — this is Next's own current
// recommendation (node_modules/next/dist/docs/.../guides/json-ld.md):
// next/script is optimized for loading/executing JS, JSON-LD is inert
// structured data. `<` is escaped to < per that same doc, so a
// malicious string ending up in the payload (e.g. an offer title someone
// set to `</script><script>...`) can't break out of the script tag.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  )
}
