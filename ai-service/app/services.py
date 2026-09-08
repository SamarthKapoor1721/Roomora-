"""Each function tries NVIDIA NIM first, then falls back to the rule-based engine.

The response always carries a `source` of "NVIDIA_AI" or "RULE_BASED_FALLBACK"
so the frontend can display which produced the result.
"""
from __future__ import annotations

import json
import logging

from . import fallback, prompts
from .nvidia_client import NvidiaUnavailable, chat_json
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

log = logging.getLogger("ai-service")

_VALID_PRIORITY = {"LOW", "MEDIUM", "HIGH", "URGENT"}
_VALID_RECO = {"STRONG", "MODERATE", "WEAK", "REVIEW"}
_VALID_DOC_STATUS = {"PENDING", "VERIFIED", "INCONSISTENT", "UNREADABLE", "FAILED"}


def _clamp_int(v, lo=0, hi=100, default=50) -> int:
    try:
        return int(max(lo, min(hi, round(float(v)))))
    except (TypeError, ValueError):
        return default


async def eligibility(req: EligibilityRequest) -> EligibilityResponse:
    user = json.dumps(req.model_dump(), default=str)
    try:
        data = await chat_json(prompts.ELIGIBILITY_SYSTEM, user, budget="blocking")
        reco = str(data.get("recommendation", "REVIEW")).upper()
        return EligibilityResponse(
            source="NVIDIA_AI",
            score=_clamp_int(data.get("score", 50)),
            scoreLabel="Advisory score",
            recommendation=reco if reco in _VALID_RECO else "REVIEW",  # type: ignore[arg-type]
            reasons=[str(x) for x in data.get("reasons", [])][:12],
            warnings=[str(x) for x in data.get("warnings", [])][:12],
            missingRequirements=[str(x) for x in data.get("missingRequirements", [])][:12],
            model=data.get("_model"),
            raw=data,
        )
    except NvidiaUnavailable as exc:
        log.warning("eligibility falling back to rules: %s", exc)
        return fallback.eligibility(req)


async def verify_documents(req: DocVerificationRequest) -> DocVerificationResponse:
    user = json.dumps(req.model_dump(), default=str)
    try:
        data = await chat_json(prompts.DOC_VERIFY_SYSTEM, user, budget="blocking")
        status = str(data.get("overallStatus", "PENDING")).upper()
        return DocVerificationResponse(
            source="NVIDIA_AI",
            overallStatus=status if status in _VALID_DOC_STATUS else "PENDING",  # type: ignore[arg-type]
            consistencyScore=_clamp_int(data.get("consistencyScore", 60)),
            extractedFields=data.get("extractedFields") or {},
            inconsistencies=[str(x) for x in data.get("inconsistencies", [])][:20],
            missingDocuments=[str(x) for x in data.get("missingDocuments", [])][:20],
            notes=data.get("notes"),
            model=data.get("_model"),
            raw=data,
        )
    except NvidiaUnavailable as exc:
        log.warning("verify_documents falling back to rules: %s", exc)
        return fallback.verify_documents(req)


async def summarize_application(payload: dict) -> SummaryResponse:
    user = json.dumps(payload, default=str)
    try:
        data = await chat_json(prompts.APP_SUMMARY_SYSTEM, user, budget="interactive")
        return SummaryResponse(
            source="NVIDIA_AI",
            summary=str(data.get("summary", "")).strip() or "No summary produced.",
            highlights=[str(x) for x in data.get("highlights", [])][:12],
            concerns=[str(x) for x in data.get("concerns", [])][:12],
            model=data.get("_model"),
        )
    except NvidiaUnavailable as exc:
        log.warning("summarize_application falling back to rules: %s", exc)
        return fallback.summarize_application(payload)


async def summarize_lease(payload: dict) -> LeaseSummaryResponse:
    user = json.dumps(payload, default=str)
    try:
        data = await chat_json(prompts.LEASE_SUMMARY_SYSTEM, user, budget="interactive")
        return LeaseSummaryResponse(
            source="NVIDIA_AI",
            summary=str(data.get("summary", "")).strip() or "No summary produced.",
            keyPoints=[str(x) for x in data.get("keyPoints", [])][:15],
            obligations=[str(x) for x in data.get("obligations", [])][:15],
            model=data.get("_model"),
        )
    except NvidiaUnavailable as exc:
        log.warning("summarize_lease falling back to rules: %s", exc)
        return fallback.summarize_lease(payload)


async def classify_maintenance(req: MaintenanceClassifyRequest) -> MaintenanceClassifyResponse:
    user = json.dumps(req.model_dump(), default=str)
    try:
        data = await chat_json(prompts.MAINTENANCE_SYSTEM, user, budget="blocking")
        prio = str(data.get("priority", "MEDIUM")).upper()
        return MaintenanceClassifyResponse(
            source="NVIDIA_AI",
            category=str(data.get("category", "General")).strip() or "General",
            priority=prio if prio in _VALID_PRIORITY else "MEDIUM",  # type: ignore[arg-type]
            reasoning=str(data.get("reasoning", "")).strip() or "Classified by NVIDIA AI.",
            suggestedActions=[str(x) for x in data.get("suggestedActions", [])][:10],
            model=data.get("_model"),
        )
    except NvidiaUnavailable as exc:
        log.warning("classify_maintenance falling back to rules: %s", exc)
        return fallback.classify_maintenance(req)


async def assistant(req: AssistantRequest) -> AssistantResponse:
    payload = {"question": req.question, "context": req.context, "history": req.history[-6:]}
    user = json.dumps(payload, default=str)
    try:
        data = await chat_json(prompts.ASSISTANT_SYSTEM, user, budget="interactive", temperature=0.2, max_tokens=1600)
        answer = str(data.get("answer", "")).strip()
        if not answer:
            raise NvidiaUnavailable("empty answer")
        return AssistantResponse(source="NVIDIA_AI", answer=answer, model=data.get("_model"))
    except NvidiaUnavailable as exc:
        log.warning("assistant falling back to rules: %s", exc)
        return AssistantResponse(
            source="RULE_BASED_FALLBACK",
            answer=fallback.assistant(req.question, req.context),
        )


async def insights(req: InsightsRequest) -> InsightsResponse:
    user = json.dumps(req.model_dump(), default=str)
    try:
        data = await chat_json(prompts.INSIGHTS_SYSTEM, user, budget="interactive")
        return InsightsResponse(
            source="NVIDIA_AI",
            insights=[str(x) for x in data.get("insights", [])][:12],
            risks=[str(x) for x in data.get("risks", [])][:12],
            opportunities=[str(x) for x in data.get("opportunities", [])][:12],
            model=data.get("_model"),
        )
    except NvidiaUnavailable as exc:
        log.warning("insights falling back to rules: %s", exc)
        return fallback.insights(req)
