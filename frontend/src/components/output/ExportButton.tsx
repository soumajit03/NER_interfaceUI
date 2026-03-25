import type { EntitySpan } from "../../types"

interface Props {
  spans: EntitySpan[]
  text: string
}

export default function ExportButton({ spans, text }: Props) {

  const handleExport = () => {
    const data = {
      text,
      entities: spans
    }

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    )

    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "annotation.json"
    a.click()
  }

  return (
    <button
      onClick={handleExport}
      style={{
        marginTop: "15px",
        padding: "10px",
        background: "#2d89ef",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer"
      }}
    >
      Export JSON
    </button>
  )
}