import type { PredictionResponse, EntitySpan } from "../../types"

interface Props {
  data: PredictionResponse | null
  spans: EntitySpan[]
  selectedIndex: number | null
  setSelectedIndex: (index: number) => void
}

// Updated to clean, light-theme pastel colors
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
}: Props) {
  if (!data) return <div className="text-slate-500 text-sm italic py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">Awaiting text analysis...</div>

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

      return previous.end === token.start && (previous.bio_label.startsWith("B-") || previous.bio_label.startsWith("I-"))
    }

  const selectedText =
    selectedIndex !== null
      ? spans[selectedIndex].text.toLowerCase()
      : null

  return (
    <div className="h-full">
      <div className="leading-[2.4] text-[15px] whitespace-pre-wrap break-words text-slate-800">
        {tokens.map((token, index) => {
          if (token.bio_label === "O") {
            return (
              <span key={index} className="mr-[5px]">
                {token.text}
              </span>
            )
          }

            if (isContinuationIToken(index)) return null

          const spanIndex = spans.findIndex((s) => s.start === token.start)
          if (spanIndex === -1) return null

          const span = spans[spanIndex]
          const isSameWord = selectedText && span.text.toLowerCase() === selectedText
          const isExactSelected = selectedIndex === spanIndex

          return (
            <span
              key={index}
              onClick={() => setSelectedIndex(spanIndex)}
              className={`
                mr-[5px] px-1.5 py-0.5 rounded-md cursor-pointer inline-flex items-center border transition-all duration-200
                ${getColorClasses(span.bio_label)}
                ${isSameWord && !isExactSelected ? 'ring-2 ring-primary/40' : ''}
                ${isExactSelected ? 'ring-2 ring-primary scale-105 shadow-sm z-10 relative' : ''}
              `}
            >
              {span.text}
              <span className="ml-1.5 text-[10px] uppercase font-bold opacity-60 tracking-wider">
                {span.bio_label}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}