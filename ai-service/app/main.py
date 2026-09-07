from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import services
from .config import settings
from .schemas import (
    AssistantRequest,
    AssistantResponse,
    DocVerificationRequest,
    DocVerificationResponse,
    EligibilityRequest,
    EligibilityResponse,
    InsightsRequest,
    InsightsResponse,
    LeaseSummaryResponse,
    MaintenanceClassifyRequest,
    MaintenanceClassifyResponse,
    SummaryResponse,
)

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="SRMS AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # backend-to-service only; not browser-exposed
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "srms-ai",
        "nvidiaConfigured": settings.nvidia_configured,
        "model": settings.nvidia_model if settings.nvidia_configured else None,
    }


@app.post("/ai/eligibility", response_model=EligibilityResponse)
async def ai_eligibility(req: EligibilityRequest) -> EligibilityResponse:
    return await services.eligibility(req)


@app.post("/ai/verify-documents", response_model=DocVerificationResponse)
async def ai_verify_documents(req: DocVerificationRequest) -> DocVerificationResponse:
    return await services.verify_documents(req)


@app.post("/ai/summarize-application", response_model=SummaryResponse)
async def ai_summarize_application(payload: dict) -> SummaryResponse:
    return await services.summarize_application(payload)


@app.post("/ai/summarize-lease", response_model=LeaseSummaryResponse)
async def ai_summarize_lease(payload: dict) -> LeaseSummaryResponse:
    return await services.summarize_lease(payload)


@app.post("/ai/classify-maintenance", response_model=MaintenanceClassifyResponse)
async def ai_classify_maintenance(req: MaintenanceClassifyRequest) -> MaintenanceClassifyResponse:
    return await services.classify_maintenance(req)


@app.post("/ai/assistant", response_model=AssistantResponse)
async def ai_assistant(req: AssistantRequest) -> AssistantResponse:
    return await services.assistant(req)


@app.post("/ai/insights", response_model=InsightsResponse)
async def ai_insights(req: InsightsRequest) -> InsightsResponse:
    return await services.insights(req)
