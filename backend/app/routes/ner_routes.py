# backend/app/routes/ner_routes.py

from collections import Counter
from datetime import datetime, timedelta, timezone
from threading import Lock
from time import perf_counter
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from ..auth import CurrentUser, get_current_user
from ..model_metrics import get_benchmark_metrics
from ..schemas import (
    BenchmarkPerformanceResponse,
    FeedbackEditBatchRequest,
    FeedbackMetricsResponse,
    LiveHealthResponse,
    TextRequest,
)
from ..inference import predict_text

router = APIRouter()

_telemetry_lock = Lock()
_latencies_ms = []
_timestamps = []
_label_counter: Counter = Counter()
_total_requests = 0
_success_requests = 0
_error_requests = 0
_started_at = datetime.now(timezone.utc)
_last_request_at = None
_feedback_events_by_user: Dict[str, List[Dict[str, str]]] = {}

_allowed_bio_labels = {
    "O",
    "B-MYTH",
    "I-MYTH",
    "B-GEO",
    "I-GEO",
    "B-LOC",
    "I-LOC",
    "B-ORG",
    "I-ORG",
}


def _iso_or_none(value):
    return value.isoformat() if value else None


def _p95(values):
    if not values:
        return None
    ordered = sorted(values)
    idx = max(0, min(len(ordered) - 1, int(round(0.95 * (len(ordered) - 1)))))
    return float(ordered[idx])


def _cleanup_old_samples(window_minutes: int = 60):
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    keep_start = 0
    for stamp in _timestamps:
        if stamp >= cutoff:
            break
        keep_start += 1

    if keep_start > 0:
        del _timestamps[:keep_start]
        del _latencies_ms[:keep_start]


def _record_success(latency_ms, response_payload):
    global _total_requests, _success_requests, _last_request_at

    labels = [
        token.get("bio_label", "O")
        for token in response_payload.get("tokens", [])
        if token.get("bio_label") and token.get("bio_label") != "O"
    ]

    now = datetime.now(timezone.utc)
    with _telemetry_lock:
        _total_requests += 1
        _success_requests += 1
        _last_request_at = now
        _timestamps.append(now)
        _latencies_ms.append(float(latency_ms))
        _label_counter.update(labels)
        _cleanup_old_samples()


def _record_error():
    global _total_requests, _error_requests, _last_request_at
    now = datetime.now(timezone.utc)
    with _telemetry_lock:
        _total_requests += 1
        _error_requests += 1
        _last_request_at = now


@router.post("/predict")
def predict(
    request: TextRequest,
    _: CurrentUser = Depends(get_current_user),
):
    started = perf_counter()
    try:
        result = predict_text(request.text)
        latency_ms = (perf_counter() - started) * 1000
        _record_success(latency_ms, result)
        return result
    except Exception:
        _record_error()
        raise


@router.get("/model/performance/benchmark", response_model=BenchmarkPerformanceResponse)
def get_model_benchmark(_: CurrentUser = Depends(get_current_user)):
    try:
        payload = get_benchmark_metrics()
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load benchmark metrics: {error}",
        ) from error

    return payload


@router.get("/model/performance/live", response_model=LiveHealthResponse)
def get_model_live_health(_: CurrentUser = Depends(get_current_user)):
    with _telemetry_lock:
        total = _total_requests
        success = _success_requests
        errors = _error_requests
        avg_latency = (sum(_latencies_ms) / len(_latencies_ms)) if _latencies_ms else None
        p95_latency = _p95(_latencies_ms)
        labels = dict(_label_counter)
        last_request = _iso_or_none(_last_request_at)
        started = _iso_or_none(_started_at)

    error_rate = float(errors / total) if total else 0.0

    return {
        "started_at": started,
        "window_minutes": 60,
        "total_requests": total,
        "success_requests": success,
        "error_requests": errors,
        "error_rate": error_rate,
        "avg_latency_ms": avg_latency,
        "p95_latency_ms": p95_latency,
        "last_request_at": last_request,
        "label_distribution": labels,
    }


@router.post("/feedback/edits")
def save_feedback_edits(
    request: FeedbackEditBatchRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    user_id = str(current_user.get("sub") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user id")

    for event in request.events:
        if event.old_bio_label not in _allowed_bio_labels:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported old label: {event.old_bio_label}",
            )
        if event.new_bio_label not in _allowed_bio_labels:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported new label: {event.new_bio_label}",
            )

    now_iso = datetime.now(timezone.utc).isoformat()
    normalized = [
        {
            "text": event.text,
            "start": str(event.start),
            "end": str(event.end),
            "old_bio_label": event.old_bio_label,
            "new_bio_label": event.new_bio_label,
            "created_at": now_iso,
        }
        for event in request.events
        if event.old_bio_label != event.new_bio_label
    ]

    with _telemetry_lock:
        _feedback_events_by_user.setdefault(user_id, []).extend(normalized)

    return {"saved": len(normalized)}


@router.get("/model/performance/feedback", response_model=FeedbackMetricsResponse)
def get_feedback_metrics(current_user: CurrentUser = Depends(get_current_user)):
    user_id = str(current_user.get("sub") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user id")

    with _telemetry_lock:
        events = list(_feedback_events_by_user.get(user_id, []))

    transitions: Counter = Counter()
    new_distribution: Counter = Counter()
    changed_to_o = 0
    changed_from_o = 0

    for event in events:
        old_label = str(event.get("old_bio_label") or "O")
        new_label = str(event.get("new_bio_label") or "O")
        transitions[f"{old_label}->{new_label}"] += 1
        new_distribution[new_label] += 1

        if new_label == "O" and old_label != "O":
            changed_to_o += 1
        if old_label == "O" and new_label != "O":
            changed_from_o += 1

    return {
        "user_id": user_id,
        "total_edits": len(events),
        "changed_to_o": changed_to_o,
        "changed_from_o": changed_from_o,
        "transitions": dict(transitions),
        "new_label_distribution": dict(new_distribution),
    }