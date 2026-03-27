import { useEffect, useMemo, useState } from "react"
import type {
  BenchmarkPerformanceResponse,
  FeedbackMetricsResponse,
  LiveHealthResponse,
} from "../types"
import {
  getBenchmarkPerformance,
  getFeedbackPerformance,
  getLivePerformance,
} from "../services/api"

function fmt(value: number | null | undefined, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return value.toFixed(digits)
}

function fmtPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return `${(value * 100).toFixed(2)}%`
}

export default function ModelPerformancePage() {
  const [benchmark, setBenchmark] = useState<BenchmarkPerformanceResponse | null>(null)
  const [live, setLive] = useState<LiveHealthResponse | null>(null)
  const [feedback, setFeedback] = useState<FeedbackMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPerformance = async () => {
    try {
      setLoading(true)
      setError(null)
      const [benchmarkRes, liveRes, feedbackRes] = await Promise.all([
        getBenchmarkPerformance(),
        getLivePerformance(),
        getFeedbackPerformance(),
      ])
      setBenchmark(benchmarkRes.data)
      setLive(liveRes.data)
      setFeedback(feedbackRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load model performance")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPerformance()
  }, [])

  const perLabelRows = useMemo(() => {
    if (!benchmark?.latest?.per_label) return []
    return Object.entries(benchmark.latest.per_label)
      .map(([label, metrics]) => ({ label, ...metrics }))
      .sort((a, b) => b.support - a.support)
  }, [benchmark])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
          Loading model performance...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Model Performance</h1>
        <p className="text-slate-500 mt-2">
          Benchmark Quality shows true validation metrics. Live Production Health shows operational behavior from real requests.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Benchmark Quality</h2>
            <p className="text-sm text-slate-500">Official metrics from model checkpoint evaluation history.</p>
          </div>
          <button onClick={loadPerformance} className="px-3 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50">
            Refresh
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Latest Micro F1</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(benchmark?.latest?.micro.f1_score)}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Latest Macro F1</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(benchmark?.latest?.macro.f1_score)}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Best Metric</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(benchmark?.metadata.best_metric)}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Latest Eval Loss</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(benchmark?.latest?.eval_loss)}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="text-left p-3">Label</th>
                <th className="text-left p-3">Precision</th>
                <th className="text-left p-3">Recall</th>
                <th className="text-left p-3">F1</th>
                <th className="text-left p-3">Support</th>
              </tr>
            </thead>
            <tbody>
              {perLabelRows.length === 0 && (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={5}>No per-label metrics found.</td>
                </tr>
              )}
              {perLabelRows.map((row) => (
                <tr key={row.label} className="border-t border-slate-200">
                  <td className="p-3 font-medium text-slate-900">{row.label}</td>
                  <td className="p-3 text-slate-700">{fmt(row.precision)}</td>
                  <td className="p-3 text-slate-700">{fmt(row.recall)}</td>
                  <td className="p-3 text-slate-700">{fmt(row.f1_score)}</td>
                  <td className="p-3 text-slate-700">{row.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 text-xs text-slate-500 grid sm:grid-cols-2 gap-2">
          <div>Best Step: {benchmark?.metadata.best_global_step ?? "-"}</div>
          <div>Current Global Step: {benchmark?.metadata.global_step ?? "-"}</div>
          <div>Train Epochs: {benchmark?.metadata.num_train_epochs ?? "-"}</div>
          <div>Batch Size: {benchmark?.metadata.train_batch_size ?? "-"}</div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Live Production Health</h2>
        <p className="text-sm text-slate-500 mb-5">Operational stats from prediction traffic. These are not accuracy/F1 quality metrics.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Requests</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{live?.total_requests ?? 0}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Error Rate</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{fmtPercent(live?.error_rate)}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Avg Latency (ms)</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(live?.avg_latency_ms, 1)}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">P95 Latency (ms)</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(live?.p95_latency_ms, 1)}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">Label Distribution</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {live && Object.keys(live.label_distribution).length === 0 && (
                <div className="p-3 text-sm text-slate-500">No label telemetry yet. Run predictions to populate.</div>
              )}
              {live && Object.entries(live.label_distribution)
                .sort((a, b) => b[1] - a[1])
                .map(([label, count]) => (
                  <div key={label} className="p-3 border-t first:border-t-0 border-slate-200 flex justify-between text-sm">
                    <span className="text-slate-700">{label}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">Session Window</h3>
            <div className="border border-slate-200 rounded-lg p-3 text-sm text-slate-700 space-y-2">
              <div>Window: Last {live?.window_minutes ?? 60} minutes</div>
              <div>Started: {live?.started_at ? new Date(live.started_at).toLocaleString() : "-"}</div>
              <div>Last request: {live?.last_request_at ? new Date(live.last_request_at).toLocaleString() : "-"}</div>
              <div>Success / Errors: {live?.success_requests ?? 0} / {live?.error_requests ?? 0}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Feedback Validation (Optional Layer)</h2>
        <p className="text-sm text-slate-500 mt-2 mb-5">
          These metrics are user-specific. Unchanged BIO labels are treated as correct, and edited labels are treated as wrong.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Reviewed Analyses</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{feedback?.total_analyses ?? 0}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Reviewed Tags</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{feedback?.total_tags_reviewed ?? 0}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Correct / Wrong</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {feedback?.correct_tags ?? 0} / {feedback?.wrong_tags ?? 0}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Estimated Accuracy</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {feedback ? `${feedback.estimated_accuracy.toFixed(2)}%` : "-"}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Changed From O</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{feedback?.changed_from_o ?? 0}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Changed To O</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{feedback?.changed_to_o ?? 0}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Raw Edit Events</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{feedback?.total_edits ?? 0}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">Transition Counts</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {!feedback || Object.keys(feedback.transitions).length === 0 ? (
                <div className="p-3 text-sm text-slate-500">No validation transitions captured yet.</div>
              ) : (
                Object.entries(feedback.transitions)
                  .sort((a, b) => b[1] - a[1])
                  .map(([transition, count]) => (
                    <div key={transition} className="p-3 border-t first:border-t-0 border-slate-200 flex justify-between text-sm">
                      <span className="text-slate-700">{transition}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-2">Final Label Distribution</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {!feedback || Object.keys(feedback.new_label_distribution).length === 0 ? (
                <div className="p-3 text-sm text-slate-500">No final labels available yet.</div>
              ) : (
                Object.entries(feedback.new_label_distribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, count]) => (
                    <div key={label} className="p-3 border-t first:border-t-0 border-slate-200 flex justify-between text-sm">
                      <span className="text-slate-700">{label}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
