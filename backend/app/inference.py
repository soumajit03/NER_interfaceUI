# backend/app/inference.py

import torch
from .model_loader import tokenizer, model

id2label = model.config.id2label


def predict_text(text: str):
    inputs = tokenizer(
        text,
        return_tensors="pt",
        return_offsets_mapping=True,
        truncation=True
    )

    offset_mapping = inputs.pop("offset_mapping")[0].tolist()
    outputs = model(**inputs)

    predictions = torch.argmax(outputs.logits, dim=2)[0].tolist()
    input_ids = inputs["input_ids"][0].tolist()

    tokens = tokenizer.convert_ids_to_tokens(input_ids)

    results = []

    for token, label_id, offset in zip(tokens, predictions, offset_mapping):

        start, end = offset

        # Skip special tokens like [CLS], [SEP]
        if start == end:
            continue

        results.append({
            "text": text[start:end],
            "start": int(start),
            "end": int(end),
            "bio_label": id2label[label_id],
            "assigned_tag": None,
            "assigned_gender": None
        })

    return {
        "text": text,
        "tokens": results
    }