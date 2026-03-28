# backend/app/inference.py

import logging
import traceback
from fastapi import HTTPException
from gradio_client import Client
from .auth import _get_config_value

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HF_SPACE_TOKEN = _get_config_value("HF_SPACE_TOKEN")
SPACE_NAME = "kingkhna/MythNER" 

logger.info(f"Connecting to private Hugging Face Space: {SPACE_NAME}")

try:
    client = Client(SPACE_NAME, token=HF_SPACE_TOKEN)
except Exception as e:
    logger.error(f"Failed to connect to Space: {str(e)}")
    client = None


def _append_o_tokens_from_gap(tokens, text: str, gap_start: int, gap_end: int):
    """Add O-labeled tokens for non-whitespace chunks in an uncovered text gap."""
    if gap_start >= gap_end:
        return

    segment = text[gap_start:gap_end]
    cursor = 0

    while cursor < len(segment):
        while cursor < len(segment) and segment[cursor].isspace():
            cursor += 1
        if cursor >= len(segment):
            break

        chunk_start = cursor
        while cursor < len(segment) and not segment[cursor].isspace():
            cursor += 1

        absolute_start = gap_start + chunk_start
        absolute_end = gap_start + cursor
        piece_text = text[absolute_start:absolute_end]

        tokens.append({
            "text": piece_text,
            "start": absolute_start,
            "end": absolute_end,
            "bio_label": "O",
            "assigned_tag": None,
            "assigned_gender": None,
        })


def _ensure_full_token_coverage(tokens, text: str):
    """Merge overlapping entity tokens and fill uncovered ranges with O tokens."""
    if not tokens:
        full_tokens = []
        _append_o_tokens_from_gap(full_tokens, text, 0, len(text))
        return full_tokens

    entity_tokens = sorted(tokens, key=lambda item: (int(item["start"]), int(item["end"])))
    normalized_entities = []

    for token in entity_tokens:
        start = int(token["start"])
        end = int(token["end"])

        if end <= start:
            continue

        if normalized_entities and start < int(normalized_entities[-1]["end"]):
            # Overlap guard: keep earliest entity span and skip overlapping duplicates.
            continue

        normalized_entities.append(token)

    full_tokens = []
    cursor = 0

    for token in normalized_entities:
        start = int(token["start"])
        end = int(token["end"])

        if cursor < start:
            _append_o_tokens_from_gap(full_tokens, text, cursor, start)

        full_tokens.append(token)
        cursor = max(cursor, end)

    if cursor < len(text):
        _append_o_tokens_from_gap(full_tokens, text, cursor, len(text))

    return full_tokens

def predict_text(text: str):
    if not HF_SPACE_TOKEN:
        raise HTTPException(status_code=500, detail="HF_SPACE_TOKEN missing from environment.")
    if not client:
        raise HTTPException(
            status_code=503, 
            detail="Could not connect to Inference Space."
        )

    all_tokens = []
    max_length = 400

    try:
        # We chunk it to respect the 512 token limits
        for i in range(0, len(text), max_length):
            chunk = text[i:i + max_length]
            
            if not chunk.strip():
                continue

            # 🔥 THE FIX: Using the exact endpoint name revealed by your test script
            hf_entities = client.predict(
                text=chunk,
                api_name="/analyze_text"
            )

            for entity in hf_entities:
                bio_label = entity.get("entity", "O")
                start = entity.get("start", 0)
                end = entity.get("end", 0)
                word = entity.get("word", "")

                global_start = int(start) + i
                global_end = int(end) + i
                piece_text = text[global_start:global_end]

                # Merge WordPiece continuation tokens
                if word.startswith("##") and all_tokens:
                    previous = all_tokens[-1]
                    if int(previous["end"]) == global_start:
                        previous["text"] += piece_text
                        previous["end"] = global_end
                        continue

                all_tokens.append({
                    "text": piece_text if piece_text else word,
                    "start": global_start,
                    "end": global_end,
                    "bio_label": bio_label,
                    "assigned_tag": None,
                    "assigned_gender": None
                })

    except Exception as e:
        logger.error(f"❌ Space Inference failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=502, detail=f"Space API Error: {str(e)}")

    all_tokens = _ensure_full_token_coverage(all_tokens, text)

    return {"text": text, "tokens": all_tokens}