import { useState } from "react"
import { predictText } from "../../services/api"
import { uploadInputFile } from "../../services/storage"
import { savePredictionHistory } from "../../services/predictions"
import type { PredictionResponse } from "../../types"

interface Props {
  text: string
  setText: (text: string) => void
  setOutput: (data: PredictionResponse) => void
}

export default function InputSection({ text, setText, setOutput }: Props) {
  const [status, setStatus] = useState<string>("")
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!text.trim()) return
    try {
      setStatus("Analyzing text...")
      const response = await predictText(text)
      setOutput(response.data)
      await savePredictionHistory(text, response.data, uploadedPath)
      setStatus("Analysis complete and saved to history")
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Analyze request failed")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus("Uploading source file...")

    uploadInputFile(file)
      .then((data) => {
        setUploadedPath(data.path)
        setStatus("File uploaded and loaded")
      })
      .catch((error) => {
        const detail = error instanceof Error ? error.message : "Upload failed"
        setStatus(`File loaded locally, but upload failed: ${detail}`)
      })

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setText(content)
    }
    reader.readAsText(file)
  }

  return (
    <div className="input-shell">

      <textarea
        rows={6}
        className="app-textarea"
        placeholder="Enter text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="input-actions">
        <button className="primary-btn" onClick={handleSubmit}>
          Analyze
        </button>

        <input
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
        />
      </div>

      {status && (
        <p style={{ marginTop: "10px", opacity: 0.9 }}>
          {status}
        </p>
      )}

    </div>
  )
}