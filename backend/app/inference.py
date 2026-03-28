# backend/app/inference.py

import torch
from .model_loader import model, tokenizer

id2label = model.config.id2label

def predict_text(text: str):
    max_length = 400  # safe margin under 512
    all_tokens = []

    for i in range(0, len(text), max_length):
        chunk = text[i:i + max_length]

        inputs = tokenizer(
            chunk,
            return_tensors="pt",
            return_offsets_mapping=True,
            truncation=True,
        )

        offset_mapping = inputs.pop("offset_mapping")[0].tolist()
        
        with torch.no_grad(): # Added memory-saving context recommended by HF
            outputs = model(**inputs)

        predictions = torch.argmax(outputs.logits, dim=2)[0].tolist()
        input_ids = inputs["input_ids"][0].tolist()
        raw_tokens = tokenizer.convert_ids_to_tokens(input_ids)

        for token, label_id, offset in zip(raw_tokens, predictions, offset_mapping):
            start, end = offset

            # Skip special tokens like [CLS], [SEP]
            if start == end:
                continue

            global_start = start + i
            global_end = end + i
            piece_text = text[global_start:global_end]
            bio_label = id2label[label_id]

            # Merge WordPiece continuation tokens (e.g., Sit + ##a)
            if token.startswith("##") and all_tokens:
                previous = all_tokens[-1]
                if int(previous["end"]) == int(global_start):
                    previous["text"] += piece_text
                    previous["end"] = int(global_end)
                    continue

            all_tokens.append(
                {
                    "text": piece_text,
                    "start": int(global_start),
                    "end": int(global_end),
                    "bio_label": bio_label,
                    "assigned_tag": None,
                    "assigned_gender": None,
                }
            )

    return {"text": text, "tokens": all_tokens}