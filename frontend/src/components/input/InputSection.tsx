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
    <div className="space-y-4">
      <textarea
        rows={14}
        className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
        placeholder="Enter your mythological text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button 
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!text.trim() || status === "Analyzing text..."}
        >
          Analyze Text
        </button>

        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="sr-only"
            accept=".txt"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Upload .txt
          </label>
        </div>
      </div>

      {status && (
        <p className="text-sm text-slate-500 animate-pulse mt-2">
          {status}
        </p>
      )}
    </div>
  )
}