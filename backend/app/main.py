# backend/app/main.py

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.ner_routes import router as ner_router
from .routes.user_routes import router as user_router

app = FastAPI()

raw_origins = os.getenv("FRONTEND_ORIGINS", "")
frontend_origin = os.getenv("FRONTEND_ORIGIN")

allowed_origins = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://ner-interface-ui.vercel.app"
]

if frontend_origin:
    allowed_origins.append(frontend_origin)

if raw_origins:
    allowed_origins.extend(
        [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    )

allowed_origins = sorted(set(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ner_router, prefix="/api")
app.include_router(user_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Ramayana NER API running"}