import type { EntitySpan, Token } from "../../types"
import { Download } from "lucide-react"
import { toDisplayBioLabel } from "../../lib/labelAlias"

interface Props {
  spans: EntitySpan[]
  tokens: Token[]
  text: string
}

export default function ExportButton({ spans, tokens, text }: Props) {

  const handleExport = () => {
    const enrichedTokens = tokens.map((token) => {
      const match = spans.find(
        (span) => token.start >= span.start && token.end <= span.end
      )
      return {
        text: token.text,
        start: token.start,
        end: token.end,
        bio_label: toDisplayBioLabel(token.bio_label),
        assigned_gender: match?.assigned_gender || null,
      }
    })

    const data = { text, tokens: enrichedTokens }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "annotation.json"
    a.click()
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Download className="size-4" />
      Export JSON
    </button>
  )
}