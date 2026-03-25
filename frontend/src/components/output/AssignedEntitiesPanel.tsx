import type { EntitySpan } from "../../types"

interface Props {
  spans: EntitySpan[]
  setSpans: (spans: EntitySpan[]) => void
}

const getTagColor = (tag: string | null) => {
  if (!tag) return "#555"
  if (tag === "CHARACTER") return "#f44336"
  if (tag === "LOCATION") return "#4caf50"
  if (tag === "EVENT") return "#9c27b0"
  return "#2196f3"
}

export default function AssignedEntitiesPanel({ spans, setSpans }: Props) {

  const removeField = (index: number, field: "assigned_tag" | "assigned_gender") => {
    const updated = [...spans]
    updated[index][field] = null
    setSpans(updated)
  }

  const filtered = spans
    .map((span, index) => ({ ...span, index }))
    .filter(s => s.assigned_tag || s.assigned_gender)

  if (filtered.length === 0)
    return <div>No assigned entities yet.</div>

  return (
    <div style={{ marginTop: "20px" }}>
      <h4>Assigned Entities</h4>

      {filtered.map((span) => (
        <div
          key={span.index}
          style={{
            marginBottom: "12px",
            padding: "10px",
            background: "#2b2b2b",
            borderRadius: "8px"
          }}
        >
          <strong>{span.text}</strong>

          <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap" }}>

            {/* TAG */}
            {span.assigned_tag && (
              <span
                style={{
                  background: getTagColor(span.assigned_tag),
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                {span.assigned_tag}
                <span
                  onClick={() => removeField(span.index, "assigned_tag")}
                  style={{ cursor: "pointer", fontWeight: "bold" }}
                >
                  ✕
                </span>
              </span>
            )}

            {/* GENDER */}
            {span.assigned_gender && (
              <span
                style={{
                  background: "#607d8b",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                {span.assigned_gender}
                <span
                  onClick={() => removeField(span.index, "assigned_gender")}
                  style={{ cursor: "pointer", fontWeight: "bold" }}
                >
                  ✕
                </span>
              </span>
            )}

          </div>
        </div>
      ))}
    </div>
  )
}