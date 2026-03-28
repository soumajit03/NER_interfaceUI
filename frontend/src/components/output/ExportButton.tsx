import type { EntitySpan, Token } from "../../types"
import { Download } from "lucide-react"
import { toDisplayBioLabel } from "../../lib/labelAlias"

interface Props {
  spans: EntitySpan[]
  tokens: Token[]
  text: string
}

function normalizeTokensWithO(text: string, tokens: Token[]): Token[] {
  const sorted = [...tokens]
    .filter((token) => token.end > token.start)
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const normalized: Token[] = []
  let cursor = 0

  const isAlphaNumeric = (char: string) => /[A-Za-z0-9]/.test(char)

  const splitTokenBoundaryPunctuation = (token: Token): Token[] => {
    const parts: Token[] = []
    let left = token.start
    let right = token.end

    while (left < right && !isAlphaNumeric(text[left])) {
      parts.push({
        text: text[left],
        start: left,
        end: left + 1,
        bio_label: "O",
        assigned_gender: null,
      })
      left += 1
    }

    const trailing: number[] = []
    while (right > left && !isAlphaNumeric(text[right - 1])) {
      trailing.push(right - 1)
      right -= 1
    }

    if (left < right) {
      parts.push({
        text: text.slice(left, right),
        start: left,
        end: right,
        bio_label: token.bio_label,
        assigned_gender: token.assigned_gender ?? null,
      })
    }

    for (let i = trailing.length - 1; i >= 0; i -= 1) {
      const pos = trailing[i]
      parts.push({
        text: text[pos],
        start: pos,
        end: pos + 1,
        bio_label: "O",
        assigned_gender: null,
      })
    }

    return parts
  }

  const appendGap = (gapStart: number, gapEnd: number) => {
    if (gapStart >= gapEnd) return
    const segment = text.slice(gapStart, gapEnd)
    let i = 0

    while (i < segment.length) {
      while (i < segment.length && /\s/.test(segment[i])) i += 1
      if (i >= segment.length) break

      const chunkStart = i
      while (i < segment.length && !/\s/.test(segment[i])) i += 1

      normalized.push({
        text: text.slice(gapStart + chunkStart, gapStart + i),
        start: gapStart + chunkStart,
        end: gapStart + i,
        bio_label: "O",
        assigned_gender: null,
      })
    }
  }

  sorted.forEach((token) => {
    if (token.start > cursor) {
      appendGap(cursor, token.start)
    }

    if (token.start >= cursor) {
      const normalizedToken: Token = {
        ...token,
        text: text.slice(token.start, token.end) || token.text,
      }
      normalized.push(...splitTokenBoundaryPunctuation(normalizedToken))
      cursor = token.end
    }
  })

  if (cursor < text.length) {
    appendGap(cursor, text.length)
  }

  return normalized
}

export default function ExportButton({ spans, tokens, text }: Props) {

  const handleExport = () => {
    const normalizedTokens = normalizeTokensWithO(text, tokens)

    const enrichedTokens = normalizedTokens.map((token) => {
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