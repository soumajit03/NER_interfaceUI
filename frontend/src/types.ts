export interface Token {
  text: string
  start: number
  end: number
  bio_label: string
  assigned_gender: string | null
}

export interface PredictionResponse {
  text: string
  tokens: Token[]
}

export interface EntitySpan {
  text: string
  start: number
  end: number
  bio_label: string
  assigned_gender: string | null
}

export interface PredictionHistoryItem {
  id: string
  input_text: string
  output_tokens: Token[]
  source_file_path: string | null
  created_at: string
}

export interface MetricBlock {
  precision: number | null
  recall: number | null
  f1_score: number | null
  support: number
}

export interface EvalSnapshot {
  step: number
  epoch: number | null
  eval_loss: number | null
  micro: MetricBlock
  macro: MetricBlock
  weighted: MetricBlock
  per_label: Record<string, MetricBlock>
}

export interface BenchmarkMetadata {
  best_global_step: number
  best_metric: number | null
  best_model_checkpoint: string | null
  global_step: number
  num_train_epochs: number | null
  train_batch_size: number
  trainer_state_path: string
}

export interface TrendPoint {
  step: number
  epoch: number | null
  eval_loss: number | null
  micro_f1: number | null
  macro_f1: number | null
  weighted_f1: number | null
}

export interface BenchmarkPerformanceResponse {
  metadata: BenchmarkMetadata
  latest: EvalSnapshot | null
  best: EvalSnapshot | null
  trends: TrendPoint[]
}

export interface LiveHealthResponse {
  started_at: string
  window_minutes: number
  total_requests: number
  success_requests: number
  error_requests: number
  error_rate: number
  avg_latency_ms: number | null
  p95_latency_ms: number | null
  last_request_at: string | null
  label_distribution: Record<string, number>
}

export interface FeedbackEditEvent {
  text: string
  start: number
  end: number
  old_bio_label: string
  new_bio_label: string
}

export interface FeedbackTokenLabel {
  text: string;
  start: number;
  end: number;
  bio_label: string;
}

export interface FeedbackAnalysisRequest {
  analysis_id: string;
  original_tokens: FeedbackTokenLabel[];
  edited_tokens: FeedbackTokenLabel[];
}

export interface FeedbackMetricsResponse {
  user_id: string
  total_edits: number
  changed_to_o: number
  changed_from_o: number
  transitions: Record<string, number>
  new_label_distribution: Record<string, number>
  total_analyses: number;
  total_tags_reviewed: number;
  correct_tags: number;
  wrong_tags: number;
  estimated_accuracy: number;
}

