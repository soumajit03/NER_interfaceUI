# backend/app/routes/ner_routes.py

from fastapi import APIRouter
from ..schemas import TextRequest
from ..inference import predict_text

router = APIRouter()


@router.post("/predict")
def predict(request: TextRequest):
    return predict_text(request.text)