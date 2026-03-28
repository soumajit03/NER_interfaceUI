import type { EntitySpan } from "../../types"
import { Trash2 } from "lucide-react"
import { toDisplayBioLabel } from "../../lib/labelAlias"

interface Props {
  spans: EntitySpan[]
  setSpans: (spans: EntitySpan[]) => void
}

const getTagColor = (bioLabel: string) => {
  if (bioLabel.includes("MYTH")) return "bg-blue-50 text-blue-700 border-blue-200"
  if (bioLabel.includes("LOC")) return "bg-green-50 text-green-700 border-green-200"
  if (bioLabel.includes("GEO")) return "bg-purple-50 text-purple-700 border-purple-200"
  if (bioLabel.includes("ORG")) return "bg-orange-50 text-orange-700 border-orange-200"
  return "bg-blue-50 text-blue-700 border-blue-200"
}

export default function AssignedEntitiesPanel({ spans, setSpans }: Props) {
  const clearGender = (index: number) => {
    const updated = [...spans]
    updated[index].assigned_gender = null
    setSpans(updated)
  }

  const filtered = spans
    .map((span, index) => ({ ...span, index }))
    .filter((s) => s.bio_label !== "O" || s.assigned_gender)

  if (filtered.length === 0)
    return (
      <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
        <p className="text-sm text-slate-500">No entities assigned yet.</p>
      </div>
    )

  return (
    <div className="space-y-3">
      {/* Column Headers */}
      <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 pb-2 border-b border-slate-100">
        <span>Entity</span>
        <span>Properties</span>
      </div>
      
      {/* Entity List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {filtered.map((span) => (
          <div
            key={span.index}
            className="flex items-start justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-slate-300 transition-colors"
          >
            <div className="font-medium text-slate-900 mt-0.5 max-w-[40%] break-words">
              {span.text}
            </div>

            <div className="flex flex-wrap justify-end gap-2 flex-1 ml-4 items-center">
              {span.bio_label !== "O" && (
                <span className={`px-2 py-1 text-[11px] font-semibold border rounded-md whitespace-nowrap ${getTagColor(span.bio_label)}`}>
                  {toDisplayBioLabel(span.bio_label)}
                </span>
              )}
              {span.assigned_gender && (
                <span className="px-2 py-1 text-[11px] font-semibold border rounded-md whitespace-nowrap bg-slate-100 text-slate-700 border-slate-200">
                  {span.assigned_gender}
                </span>
              )}
              <button
                onClick={() => clearGender(span.index)}
                className="ml-1 p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                title="Clear gender"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}