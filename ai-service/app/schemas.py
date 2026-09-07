from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Source = Literal["NVIDIA_AI", "RULE_BASED_FALLBACK"]


# ---------- Eligibility ----------
class Applicant(BaseModel):
    fullName: str
    monthlyIncome: float | None = None
    employmentStatus: str | None = None
    employerName: str | None = None
    occupants: int = 1
    hasPets: bool = False
    smoker: bool = False
    notes: str | None = None


class RoomInfo(BaseModel):
    name: str
    monthlyRent: float
    capacity: int = 1
    roommatesLimit: int = 1
    foodEnabled: bool = False


class EligibilityRequest(BaseModel):
    applicant: Applicant
    room: RoomInfo
    requiredDocuments: list[str] = Field(default_factory=list)
    providedDocuments: list[str] = Field(default_factory=list)


class EligibilityResponse(BaseModel):
    source: Source
    score: int
    scoreLabel: str
    recommendation: Literal["STRONG", "MODERATE", "WEAK", "REVIEW"]
    reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    missingRequirements: list[str] = Field(default_factory=list)
    model: str | None = None
    raw: Any | None = None


# ---------- Document verification ----------
class DocInput(BaseModel):
    type: str
    originalName: str
    extractedText: str | None = None


class DocVerificationRequest(BaseModel):
    applicant: dict[str, Any]
    documents: list[DocInput] = Field(default_factory=list)
    requiredDocuments: list[str] = Field(default_factory=list)


class DocVerificationResponse(BaseModel):
    source: Source
    overallStatus: Literal["PENDING", "VERIFIED", "INCONSISTENT", "UNREADABLE", "FAILED"]
    consistencyScore: int
    extractedFields: dict[str, Any] = Field(default_factory=dict)
    inconsistencies: list[str] = Field(default_factory=list)
    missingDocuments: list[str] = Field(default_factory=list)
    notes: str | None = None
    model: str | None = None
    raw: Any | None = None


# ---------- Summaries ----------
class SummaryResponse(BaseModel):
    source: Source
    summary: str
    highlights: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    model: str | None = None


class LeaseSummaryResponse(BaseModel):
    source: Source
    summary: str
    keyPoints: list[str] = Field(default_factory=list)
    obligations: list[str] = Field(default_factory=list)
    model: str | None = None


# ---------- Maintenance ----------
class MaintenanceClassifyRequest(BaseModel):
    title: str
    description: str


class MaintenanceClassifyResponse(BaseModel):
    source: Source
    category: str
    priority: Literal["LOW", "MEDIUM", "HIGH", "URGENT"]
    reasoning: str
    suggestedActions: list[str] = Field(default_factory=list)
    model: str | None = None


# ---------- Assistant ----------
class AssistantRequest(BaseModel):
    question: str
    context: dict[str, Any] = Field(default_factory=dict)
    history: list[dict[str, str]] = Field(default_factory=list)


class AssistantResponse(BaseModel):
    source: Source
    answer: str
    model: str | None = None


# ---------- Insights ----------
class InsightsRequest(BaseModel):
    metrics: dict[str, Any] = Field(default_factory=dict)


class InsightsResponse(BaseModel):
    source: Source
    insights: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    model: str | None = None
