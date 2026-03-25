import { useState } from "react"
import { predictText } from "../../services/api"
import type { PredictionResponse } from "../../types"

interface Props {
  setOutput: (data: PredictionResponse) => void
}

export default function InputSection({ setOutput }: Props) {
  const [text, setText] = useState<string>("")

  const handleSubmit = async () => {
    if (!text.trim()) return
    const response = await predictText(text)
    setOutput(response.data)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setText(content)
    }
    reader.readAsText(file)
  }

  return (
    <div>

      <textarea
        rows={6}
        style={{ width: "100%", padding: "10px" }}
        placeholder="Enter text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
        <button onClick={handleSubmit}>
          Analyze
        </button>

        <input
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
        />
      </div>

    </div>
  )
}