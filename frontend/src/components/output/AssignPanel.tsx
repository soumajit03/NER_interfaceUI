import { useState } from "react"
import type { EntitySpan } from "../../types"

interface Props {
  spans: EntitySpan[]
  selectedIndex: number | null
  setSpans: (spans: EntitySpan[]) => void
}

const TAG_OPTIONS = [
  "CHARACTER",
  "COLOR",
  "DISEASE",
  "EVENT",
  "FACILITY",
  "GROUP",
  "LANGUAGE",
  "LOCATION",
  "NATURAL_OBJECT",
  "NUM",
]

const GENDER_OPTIONS = [
  "MALE",
  "FEMALE",
  "EUNUCH",
  "BISEXUAL",
  "TRANSGENDER",
  "UNSPECIFIED",
]

export default function AssignPanel({
  spans,
  selectedIndex,
  setSpans,
}: Props) {
  const [activeTab, setActiveTab] = useState<"tag" | "gender">("tag")

  // 🔴 No entity selected
  if (selectedIndex === null) {
    return (
      <div style={{ flex: 1, padding: "10px" }}>
        <h4>Assign Panel</h4>
        <p style={{ opacity: 0.7 }}>Select an entity to begin</p>
      </div>
    )
  }

  const selectedSpan = spans[selectedIndex]

  const updateField = (
  field: "assigned_tag" | "assigned_gender",
  value: string
) => {
  const updated = [...spans]

  const selectedText = updated[selectedIndex].text.toLowerCase()

  // 🔥 Apply to ALL matching words
  updated.forEach((span) => {
    if (span.text.toLowerCase() === selectedText) {
      span[field] = value
    }
  })

  setSpans(updated)
}

  return (
    <div style={{ flex: 1, padding: "10px" }}>
      
      {/* 🔹 SUB-TABS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <button
          onClick={() => setActiveTab("tag")}
          style={{
            padding: "8px 14px",
            borderRadius: "20px",
            border: "none",
            cursor: "pointer",
            background: activeTab === "tag" ? "#2d89ef" : "#444",
            color: "white",
            fontSize: "13px",
          }}
        >
          Assign Tag
        </button>

        <button
          onClick={() => setActiveTab("gender")}
          style={{
            padding: "8px 14px",
            borderRadius: "20px",
            border: "none",
            cursor: "pointer",
            background: activeTab === "gender" ? "#2d89ef" : "#444",
            color: "white",
            fontSize: "13px",
          }}
        >
          Assign Gender
        </button>
      </div>

      {/* 🔹 SELECTED ENTITY */}
      <div
        style={{
          marginBottom: "15px",
          padding: "10px",
          background: "#2b2b2b",
          borderRadius: "8px",
          fontWeight: "bold",
        }}
      >
        {selectedSpan.text}
      </div>

      {/* 🔹 TAG SECTION */}
      {activeTab === "tag" && (
        <div>
          <h5 style={{ marginBottom: "8px" }}>Assign Tag</h5>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => updateField("assigned_tag", tag)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  background:
                    selectedSpan.assigned_tag === tag
                      ? "#2d89ef"
                      : "#444",
                  color: "white",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🔹 GENDER SECTION */}
      {activeTab === "gender" && (
        <div>
          <h5 style={{ marginBottom: "8px" }}>Assign Gender</h5>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {GENDER_OPTIONS.map((gender) => (
              <button
                key={gender}
                onClick={() => updateField("assigned_gender", gender)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  background:
                    selectedSpan.assigned_gender === gender
                      ? "#2d89ef"
                      : "#444",
                  color: "white",
                }}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}