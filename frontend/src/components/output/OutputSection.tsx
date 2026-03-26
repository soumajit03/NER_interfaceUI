import type { PredictionResponse, EntitySpan } from "../../types"

interface Props {
  data: PredictionResponse | null
  spans: EntitySpan[]
  selectedIndex: number | null
  setSelectedIndex: (index: number) => void
}

const getColor = (label: string) => {
  if (label.includes("MYTH")) return "#42adf4"
  if (label.includes("LOC")) return "#4caf50"
  if (label.includes("GEO")) return "#9c27b0"
  if (label.includes("ORG")) return "#ff5722"
  return "#ccc"
}

export default function OutputSection({
  data,
  spans,
  selectedIndex,
  setSelectedIndex,
}: Props) {
  if (!data) return <div>No output yet.</div>

  const tokens = data.tokens

  // 🔥 Selected word (case-insensitive)
  const selectedText =
    selectedIndex !== null
      ? spans[selectedIndex].text.toLowerCase()
      : null

  return (
    <div style={{ flex: 2 }}>
      <h3>NER Output</h3>

      <div style={{ lineHeight: "2.5", fontSize: "16px" }}>
        {tokens.map((token, index) => {
          // ✅ O tokens (normal text)
          if (token.bio_label === "O") {
            return (
              <span key={index} style={{ marginRight: "6px" }}>
                {token.text}
              </span>
            )
          }

          // ❌ Skip I- tokens
          if (token.bio_label.startsWith("I-")) return null

          // 🔍 Find span
          const spanIndex = spans.findIndex(
            (s) => s.start === token.start
          )

          if (spanIndex === -1) return null

          const span = spans[spanIndex]

          const isSameWord =
            selectedText &&
            span.text.toLowerCase() === selectedText

          const isExactSelected = selectedIndex === spanIndex

          return (
            <span
              key={index}
              onClick={() => setSelectedIndex(spanIndex)}
              style={{
                marginRight: "6px",
                backgroundColor: getColor(span.bio_label),
                padding: "4px 10px",
                borderRadius: "6px",
                cursor: "pointer",

                // 🔥 Multi-highlight + main highlight
                border: isSameWord ? "2px solid white" : "none",
                boxShadow: isExactSelected
                  ? "0 0 8px rgba(255,255,255,0.8)"
                  : "none",

                transform: isExactSelected ? "scale(1.05)" : "scale(1)",

                transition: "all 0.2s ease",
              }}
            >
              {span.text}

              <span
                style={{
                  background: "#222",
                  color: "#fff",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  marginLeft: "6px",
                  fontSize: "12px",
                }}
              >
                {span.bio_label}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}