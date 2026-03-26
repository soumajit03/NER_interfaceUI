import type { EntitySpan, Token } from "../../types"

interface Props {
  spans: EntitySpan[]
  tokens: Token[]
  text: string
}

export default function ExportButton({ spans, tokens, text }: Props) {

  const handleExport = () => {

    const enrichedTokens = tokens.map((token) => {
      // Find matching span
      const match = spans.find(
        (span) =>
          token.start >= span.start &&
          token.end <= span.end
      )

      return {
        text: token.text,
        start: token.start,
        end: token.end,
        bio_label: token.bio_label,
        assigned_tag: match?.assigned_tag || null,
        assigned_gender: match?.assigned_gender || null,
      }
    })

    const data = {
      text,
      tokens: enrichedTokens
    }

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    )

    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "annotation.json"
    a.click()
  }

  return (
    <button
      onClick={handleExport}
      style={{
  padding: "10px 16px",
  background: "#2d89ef",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  width: "fit-content",
}}
    >
      Export JSON
    </button>
  )
}