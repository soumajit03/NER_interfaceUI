# backend/app/schemas.py

from pydantic import BaseModel
from typing import Dict, List, Optional


class TextRequest(BaseModel):
    text: str


class MetricBlock(BaseModel):
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    support: int = 0


class EvalSnapshot(BaseModel):
    step: int
    epoch: Optional[float] = None
    eval_loss: Optional[float] = None
    micro: MetricBlock
    macro: MetricBlock
    weighted: MetricBlock
    per_label: Dict[str, MetricBlock]


class BenchmarkMetadata(BaseModel):
    best_global_step: int
    best_metric: Optional[float] = None
    best_model_checkpoint: Optional[str] = None
    global_step: int
    num_train_epochs: Optional[float] = None
    train_batch_size: int
    trainer_state_path: str


class TrendPoint(BaseModel):
    step: int
    epoch: Optional[float] = None
    eval_loss: Optional[float] = None
    micro_f1: Optional[float] = None
    macro_f1: Optional[float] = None
    weighted_f1: Optional[float] = None


class BenchmarkPerformanceResponse(BaseModel):
    metadata: BenchmarkMetadata
    latest: Optional[EvalSnapshot] = None
    best: Optional[EvalSnapshot] = None
    trends: List[TrendPoint]


class LiveHealthResponse(BaseModel):
    started_at: str
    window_minutes: int
    total_requests: int
    success_requests: int
    error_requests: int
    error_rate: float
    avg_latency_ms: Optional[float] = None
    p95_latency_ms: Optional[float] = None
    last_request_at: Optional[str] = None
    label_distribution: Dict[str, int]


class FeedbackEditEvent(BaseModel):
    text: str
    start: int
    end: int
    old_bio_label: str
    new_bio_label: str


class FeedbackEditBatchRequest(BaseModel):
    events: List[FeedbackEditEvent]


class FeedbackTokenLabel(BaseModel):
    text: str
    start: int
    end: int
    bio_label: str


class FeedbackAnalysisRequest(BaseModel):
    analysis_id: str
    original_tokens: List[FeedbackTokenLabel]
    edited_tokens: List[FeedbackTokenLabel]


class FeedbackMetricsResponse(BaseModel):
    user_id: str
    total_analyses: int
    total_tags_reviewed: int
    correct_tags: int
    wrong_tags: int
    estimated_accuracy: float
    total_edits: int
    changed_to_o: int
    changed_from_o: int
    transitions: Dict[str, int]
    new_label_distribution: Dict[str, int]