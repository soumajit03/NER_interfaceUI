import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import type { PredictionHistoryItem } from "../types"

interface HistoryPageProps {
  onOpenInAnnotator: (item: PredictionHistoryItem) => void
}

export default function HistoryPage({ onOpenInAnnotator }: HistoryPageProps) {
  const [history, setHistory] = useState<PredictionHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("prediction_history")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError

      setHistory(data || [])
    } catch (err) {
      console.error("Error loading history:", err)
      setError(err instanceof Error ? err.message : "Failed to load history")
    } finally {
      setLoading(false)
    }
  }

  const deleteHistoryItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const { error: deleteError } = await supabase
        .from("prediction_history")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      setHistory((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error("Error deleting item:", err)
      alert("Failed to delete item")
    }
  }

  const filteredHistory = history.filter((item) => {
    const matchesSearch = searchTerm
      ? item.input_text.toLowerCase().includes(searchTerm.toLowerCase())
      : true

    const itemDate = new Date(item.created_at)
    const matchesStartDate = startDate ? itemDate >= new Date(startDate) : true
    const matchesEndDate = endDate ? itemDate <= new Date(endDate) : true

    return matchesSearch && matchesStartDate && matchesEndDate
  })

  const setDatePreset = (preset: "today" | "week" | "month" | "all") => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (preset) {
      case "today":
        setStartDate(today.toISOString().split("T")[0])
        setEndDate(now.toISOString().split("T")[0])
        break
      case "week":
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        setStartDate(weekAgo.toISOString().split("T")[0])
        setEndDate(now.toISOString().split("T")[0])
        break
      case "month":
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        setStartDate(monthAgo.toISOString().split("T")[0])
        setEndDate(now.toISOString().split("T")[0])
        break
      case "all":
        setStartDate("")
        setEndDate("")
        break
    }
  }

  if (loading) {
    return (
      <div className="section-container">
        <p>Loading history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="section-container">
        <p className="status-error">Error: {error}</p>
        <button onClick={loadHistory}>Retry</button>
      </div>
    )
  }

  return (
    <div className="section-container">
      <div className="section-head">
        <h2>Prediction History</h2>
        <p>View and manage your past NER predictions</p>
      </div>

      <div className="history-filters">
        <div className="date-filter-field">
          <label>Search Text</label>
          <input
            type="text"
            className="history-input"
            placeholder="Search predictions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="date-filter-field">
          <label>Start Date</label>
          <div className="date-input-wrap">
            <input
              type="date"
              className="history-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            {startDate && (
              <button className="ghost-btn" onClick={() => setStartDate("")}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="date-filter-field">
          <label>End Date</label>
          <div className="date-input-wrap">
            <input
              type="date"
              className="history-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {endDate && (
              <button className="ghost-btn" onClick={() => setEndDate("")}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="date-filter-field">
          <label>Quick Filter</label>
          <button className="ghost-btn" onClick={loadHistory}>
            Refresh
          </button>
        </div>
      </div>

      <div className="range-presets">
        <button className="ghost-btn" onClick={() => setDatePreset("today")}>
          Today
        </button>
        <button className="ghost-btn" onClick={() => setDatePreset("week")}>
          Last 7 Days
        </button>
        <button className="ghost-btn" onClick={() => setDatePreset("month")}>
          Last 30 Days
        </button>
        <button className="ghost-btn" onClick={() => setDatePreset("all")}>
          All Time
        </button>
      </div>

      {filteredHistory.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          {history.length === 0
            ? "No predictions yet. Start by analyzing some text!"
            : "No results match your filters."}
        </p>
      ) : (
        <div className="history-grid">
          {filteredHistory.map((item) => (
            <div key={item.id} className="history-card">
              <div className="history-top-row">
                <span>{new Date(item.created_at).toLocaleString()}</span>
                <span>
                  {item.output_tokens.filter((t) => t.bio_label !== "O").length} entities
                </span>
              </div>

              <p className="history-text">
                {item.input_text.length > 200
                  ? item.input_text.slice(0, 200) + "..."
                  : item.input_text}
              </p>

              {item.source_file_path && (
                <p className="history-file">📄 {item.source_file_path}</p>
              )}

              <div className="history-actions">
                <button className="ghost-btn" onClick={() => onOpenInAnnotator(item)}>
                  Open in Annotator
                </button>
                <button className="danger-btn" onClick={() => deleteHistoryItem(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
