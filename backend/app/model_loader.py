# backend/app/model_loader.py

from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch
import os

MODEL_PATH = os.path.abspath("../model")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)

model.eval()