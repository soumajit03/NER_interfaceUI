import { useState } from "react"
import type { EntitySpan } from "../../types"
import { toDisplayBioLabel } from "../../lib/labelAlias"

interface Props {
  spans: EntitySpan[]
  selectedIndex: number | null
  setSpans: (spans: EntitySpan[]) => void
  onApplyBioLabel: (selectedIndex: number, nextBioLabel: string) => void
}

const BIO_OPTIONS = [
  "O",
  "B-MYTH",
  "I-MYTH",
  "B-GEO",
  "I-GEO",
  "B-LOC",
  "I-LOC",
  "B-ORG",
  "I-ORG",
]

const DISPLAY_BIO_OPTIONS = BIO_OPTIONS.map((option) => ({
  canonical: option,
  display: toDisplayBioLabel(option),
}))

const GENDER_OPTIONS = [
  "MALE", "FEMALE", "EUNUCH", "BISEXUAL", "TRANSGENDER", "UNSPECIFIED",
]

export default function AssignPanel({ spans, selectedIndex, setSpans, onApplyBioLabel }: Props) {
  const [activeTab, setActiveTab] = useState<"tag" | "gender">("tag")

  if (selectedIndex === null) {
    return (
      <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
        <p className="text-sm text-slate-500">Select a highlighted entity<br/>in the output to assign properties.</p>
      </div>
    )
  }

  const selectedSpan = spans[selectedIndex]

  const updateField = (field: "assigned_gender", value: string) => {
    const updated = [...spans]
    const selectedText = updated[selectedIndex].text.toLowerCase()

    updated.forEach((span) => {
      if (span.text.toLowerCase() === selectedText) {
        span[field] = value
      }
    })

    setSpans(updated)
  }

  return (
    <div className="space-y-5">
      
      {/* Segmented Control Tabs */}
      <div className="flex p-1 space-x-1 bg-slate-100 rounded-lg">
        <button
          onClick={() => setActiveTab("tag")}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === "tag" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Assign BIO Label
        </button>
        <button
          onClick={() => setActiveTab("gender")}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === "gender" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Assign Gender
        </button>
      </div>

      {/* Selected Entity Display */}
      <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-md">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Editing Entity</span>
        <span className="font-bold text-slate-900 text-lg">{selectedSpan.text}</span>
      </div>

      {/* Options Grid */}
      <div>
        <div className="flex flex-wrap gap-2">
          {(activeTab === "tag" ? DISPLAY_BIO_OPTIONS : GENDER_OPTIONS).map((option) => {
            const value = activeTab === "tag" ? option.canonical : option
            const label = activeTab === "tag" ? option.display : option
            const isSelected = activeTab === "tag" 
              ? selectedSpan.bio_label === value
              : selectedSpan.assigned_gender === value;

            return (
              <button
                key={value}
                onClick={() =>
                  activeTab === "tag"
                    ? onApplyBioLabel(selectedIndex, value)
                    : updateField("assigned_gender", value)
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-4 italic">
          * BIO label updates are applied to all matching instances of this word.
        </p>
      </div>
    </div>
  )
}