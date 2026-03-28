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

    return {"text": text, "tokens": all_tokens}