import json
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional


_cache_lock = Lock()
_cached_mtime: Optional[float] = None
_cached_payload: Optional[Dict[str, Any]] = None


def _workspace_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _trainer_state_path() -> Path:
    return _workspace_root() / "backend" / "app" / "metrics" / "trainer_state.json"


def _safe_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _metric_block(block: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    block = block or {}
    return {
        "precision": _safe_float(block.get("precision")),
        "recall": _safe_float(block.get("recall")),
        "f1_score": _safe_float(block.get("f1-score")),
        "support": int(block.get("support") or 0),
    }


def _find_eval_entries(log_history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [entry for entry in log_history if "eval_loss" in entry]


def _snapshot(entry: Dict[str, Any]) -> Dict[str, Any]:
    labels: Dict[str, Dict[str, Any]] = {}
    for key, value in entry.items():
        if not key.startswith("eval_"):
            continue
        if key in {
            "eval_loss",
            "eval_macro avg",
            "eval_micro avg",
            "eval_weighted avg",
            "eval_runtime",
            "eval_samples_per_second",
            "eval_steps_per_second",
        }:
            continue
        if isinstance(value, dict):
            labels[key.replace("eval_", "")] = _metric_block(value)

    return {
        "step": int(entry.get("step") or 0),
        "epoch": _safe_float(entry.get("epoch")),
        "eval_loss": _safe_float(entry.get("eval_loss")),
        "micro": _metric_block(entry.get("eval_micro avg")),
        "macro": _metric_block(entry.get("eval_macro avg")),
        "weighted": _metric_block(entry.get("eval_weighted avg")),
        "per_label": labels,
    }


def _trends(eval_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    trend_points: List[Dict[str, Any]] = []
    for entry in eval_entries:
        micro = _metric_block(entry.get("eval_micro avg"))
        macro = _metric_block(entry.get("eval_macro avg"))
        weighted = _metric_block(entry.get("eval_weighted avg"))
        trend_points.append(
            {
                "step": int(entry.get("step") or 0),
                "epoch": _safe_float(entry.get("epoch")),
                "eval_loss": _safe_float(entry.get("eval_loss")),
                "micro_f1": micro["f1_score"],
                "macro_f1": macro["f1_score"],
                "weighted_f1": weighted["f1_score"],
            }
        )
    return trend_points


def get_benchmark_metrics() -> Dict[str, Any]:
    global _cached_mtime, _cached_payload

    trainer_state_file = _trainer_state_path()
    if not trainer_state_file.exists():
        raise FileNotFoundError(f"Trainer state file not found: {trainer_state_file}")

    mtime = trainer_state_file.stat().st_mtime

    with _cache_lock:
        if _cached_payload is not None and _cached_mtime == mtime:
            return _cached_payload

        with trainer_state_file.open("r", encoding="utf-8") as handle:
            state = json.load(handle)

        log_history = state.get("log_history") or []
        eval_entries = _find_eval_entries(log_history)

        latest_snapshot = _snapshot(eval_entries[-1]) if eval_entries else None
        best_step = int(state.get("best_global_step") or 0)
        best_entry = next((entry for entry in eval_entries if int(entry.get("step") or 0) == best_step), None)
        best_snapshot = _snapshot(best_entry) if best_entry else None

        payload = {
            "metadata": {
                "best_global_step": best_step,
                "best_metric": _safe_float(state.get("best_metric")),
                "best_model_checkpoint": state.get("best_model_checkpoint"),
                "global_step": int(state.get("global_step") or 0),
                "num_train_epochs": _safe_float(state.get("num_train_epochs")),
                "train_batch_size": int(state.get("train_batch_size") or 0),
                "trainer_state_path": str(trainer_state_file),
            },
            "latest": latest_snapshot,
            "best": best_snapshot,
            "trends": _trends(eval_entries),
        }

        _cached_mtime = mtime
        _cached_payload = payload
        return payload
