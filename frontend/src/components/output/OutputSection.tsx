import type { PredictionResponse, EntitySpan } from "../../types"
import { toDisplayBioLabel } from "../../lib/labelAlias"

interface Props {
  data: PredictionResponse | null
  spans: EntitySpan[]
  selectedIndex: number | null
  setSelectedIndex: (index: number) => void
  spanIndexMap?: number[]
}

const getColorClasses = (label: string) => {
  if (label.includes("MYTH")) return "bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-200"
  if (label.includes("LOC")) return "bg-green-100 text-green-900 border-green-200 hover:bg-green-200"
  if (label.includes("GEO")) return "bg-purple-100 text-purple-900 border-purple-200 hover:bg-purple-200"
  if (label.includes("ORG")) return "bg-orange-100 text-orange-900 border-orange-200 hover:bg-orange-200"
  return "bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200"
}

export default function OutputSection({
  data,
  spans,
  selectedIndex,
  setSelectedIndex,
  spanIndexMap,
}: Props) {
  if (!data) {
    return (
      <div className="text-slate-500 text-sm italic py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
        Awaiting text analysis...
      </div>
    )
  }

  const tokens = data.tokens

  const isContinuationIToken = (index: number) => {
    const token = tokens[index]
    if (!token.bio_label.startsWith("I-")) return false
    if (index === 0) return false

    const previous = tokens[index - 1]
    if (!previous.bio_label.includes("-")) return false

    const currentEntity = token.bio_label.split("-")[1]
    const previousEntity = previous.bio_label.split("-")[1]
    if (currentEntity !== previousEntity) return false

    return (
      previous.end === token.start
      && (previous.bio_label.startsWith("B-") || previous.bio_label.startsWith("I-"))
    )
  }

  const resolveGlobalIndex = (localIndex: number) =>
    spanIndexMap ? (spanIndexMap[localIndex] ?? localIndex) : localIndex

  const selectedLocalIndex =
    selectedIndex === null
      ? null
      : spanIndexMap
        ? spanIndexMap.findIndex((globalIndex) => globalIndex === selectedIndex)
        : selectedIndex

  const selectedText =
    selectedLocalIndex !== null && selectedLocalIndex >= 0 && spans[selectedLocalIndex]
      ? spans[selectedLocalIndex].text.toLowerCase()
      : null

  const displayItems = tokens
    .map((token, index) => {
      if (isContinuationIToken(index)) {
        return null
      }

      const exactSpanIndex = spans.findIndex((s) => s.start === token.start && s.end === token.end)

      if (token.bio_label === "O") {
        return {
          key: `plain-${index}-${token.start}-${token.end}`,
          kind: "plain" as const,
          start: token.start,
          end: token.end,
          text: data.text.slice(token.start, token.end),
          spanIndex: exactSpanIndex,
        }
      }

      const entitySpanIndex = spans.findIndex((s) => s.start === token.start)
      if (entitySpanIndex === -1) {
        return {
          key: `fallback-${index}-${token.start}-${token.end}`,
          kind: "plain" as const,
          start: token.start,
          end: token.end,
          text: data.text.slice(token.start, token.end),
          spanIndex: exactSpanIndex,
        }
      }

      const span = spans[entitySpanIndex]
      return {
        key: `entity-${index}-${span.start}-${span.end}`,
        kind: "entity" as const,
        start: span.start,
        end: span.end,
        spanIndex: entitySpanIndex,
        text: data.text.slice(span.start, span.end),
        bioLabel: span.bio_label,
      }
    })
    .filter((item) => item !== null)

  return (
    <div className="h-full w-full">
      <div className="text-[15px] leading-8 whitespace-pre-wrap wrap-anywhere text-slate-800 pb-2">
        {displayItems.map((item, index) => {
          const previousEnd = index === 0 ? 0 : displayItems[index - 1].end
          const gap = previousEnd < item.start ? data.text.slice(previousEnd, item.start) : ""

          if (item.kind === "plain") {
            const isSelectable = item.spanIndex >= 0
            const globalSpanIndex = isSelectable ? resolveGlobalIndex(item.spanIndex) : null
            const plainSpan = isSelectable ? spans[item.spanIndex] : null
            const isSameWord = !!(plainSpan && selectedText && plainSpan.text.toLowerCase() === selectedText)
            const isExactSelected = globalSpanIndex !== null && selectedIndex === globalSpanIndex

            return (
              <span key={item.key}>
                {gap}
                <span
                  onClick={isSelectable ? () => setSelectedIndex(globalSpanIndex as number) : undefined}
                  className={isSelectable
                    ? `cursor-pointer rounded px-0.5 ${isSameWord && !isExactSelected ? "bg-slate-100" : ""} ${isExactSelected ? "ring-2 ring-primary/40 bg-slate-100" : ""}`
                    : ""}
                >
                  {item.text}
                </span>
              </span>
            )
          }

          const globalSpanIndex = resolveGlobalIndex(item.spanIndex)
          const isSameWord = !!(selectedText && spans[item.spanIndex]?.text.toLowerCase() === selectedText)
          const isExactSelected = selectedIndex === globalSpanIndex

          return (
            <span key={item.key}>
              {gap}
              <span
                onClick={() => setSelectedIndex(globalSpanIndex)}
                className={`
                  px-1.5 py-0.5 rounded-md cursor-pointer inline-flex items-center border transition-all duration-200 align-middle max-w-full
                  ${getColorClasses(item.bioLabel)}
                  ${isSameWord && !isExactSelected ? "ring-2 ring-primary/40" : ""}
                  ${isExactSelected ? "ring-2 ring-primary shadow-sm z-10 relative" : ""}
                `}
              >
                {item.text}
                <span className="ml-1.5 text-[10px] uppercase font-bold opacity-60 tracking-wider">
                  {toDisplayBioLabel(item.bioLabel)}
                </span>
              </span>
            </span>
          )
        })}
        {displayItems.length > 0 && displayItems[displayItems.length - 1].end < data.text.length && (
          <span>{data.text.slice(displayItems[displayItems.length - 1].end)}</span>
        )}
      </div>
    </div>
  )
}
