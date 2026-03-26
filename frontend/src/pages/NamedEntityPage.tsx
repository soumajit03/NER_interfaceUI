import { useState } from "react"
import CollapsibleSection from "../components/common/CollapsibleSection"
import InputSection from "../components/input/InputSection"
import OutputSection from "../components/output/OutputSection"
import AssignPanel from "../components/output/AssignPanel"
import type { PredictionResponse, EntitySpan, Token } from "../types"
import AssignedEntitiesPanel from "../components/output/AssignedEntitiesPanel"
import ExportButton from "../components/output/ExportButton"

export default function NamedEntityPage() {
  const [output, setOutput] = useState<PredictionResponse | null>(null)
  const [spans, setSpans] = useState<EntitySpan[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const mergeTokensToSpans = (tokens: Token[], fullText: string): EntitySpan[] => {
  const merged: EntitySpan[] = []
  let current: EntitySpan | null = null

  tokens.forEach((token) => {
    if (token.bio_label.startsWith("B-")) {
      if (current) merged.push(current)

      current = {
        text: fullText.slice(token.start, token.end),
        start: token.start,
        end: token.end,
        bio_label: token.bio_label,
        assigned_tag: null,
        assigned_gender: null,
      }
    }

    else if (token.bio_label.startsWith("I-") && current) {
      current.end = token.end
      current.text = fullText.slice(current.start, current.end)
    }

    else {
      if (current) {
        merged.push(current)
        current = null
      }
    }
  })

  if (current) merged.push(current)

  return merged
}

  const handlePrediction = (data: PredictionResponse) => {
    setOutput(data)
    const mergedSpans = mergeTokensToSpans(data.tokens, data.text)
    setSpans(mergedSpans)
    setSelectedIndex(null)
  }

  return (
    <>
      <CollapsibleSection title="Input Section">
        <InputSection setOutput={handlePrediction} />
      </CollapsibleSection>

      <CollapsibleSection title="Output Section">
  <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

    {/* LEFT: OUTPUT */}
    <div style={{ flex: 2 }}>
      <OutputSection
        data={output}
        spans={spans}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
      />
      {output && (
        <ExportButton
  spans={spans}
  tokens={output.tokens}
  text={output.text}
/>
      )}
    </div>

    {/* RIGHT: PANEL */}
    <div style={{ flex: 1, maxHeight: "70vh", overflowY: "auto" }}>
      <AssignPanel
        spans={spans}
        selectedIndex={selectedIndex}
        setSpans={setSpans}
      />

      <AssignedEntitiesPanel spans={spans} setSpans={setSpans} />
    </div>

  </div>
</CollapsibleSection>
    </>
  )
}