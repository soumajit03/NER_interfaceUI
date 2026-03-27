# backend/app/routes/ner_routes.py

from fastapi import APIRouter, Depends
from ..auth import CurrentUser, get_current_user
from ..schemas import TextRequest
from ..inference import predict_text

router = APIRouter()


@router.post("/predict")
def predict(
    request: TextRequest,
    _: CurrentUser = Depends(get_current_user),
):
    return predict_text(request.text)