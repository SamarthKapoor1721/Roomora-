"""Rule-based / keyword-matching fallback used when NVIDIA NIM is unavailable.

Key semantics: for eligibility, the percentage returned is a **criteria match**
(how well the applicant matches the owner's letting criteria), NOT a probability
of approval. The owner always makes the final decision.
"""
from __future__ import annotations

from .schemas import (
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

FALLBACK = "RULE_BASED_FALLBACK"


def _clamp(n: float, lo: int = 0, hi: int = 100) -> int:
    return int(max(lo, min(hi, round(n))))


# ---------------------------------------------------------------------------
# Eligibility — criteria match
# ---------------------------------------------------------------------------
def eligibility(req: EligibilityRequest) -> EligibilityResponse:
    reasons: list[str] = []
    warnings: list[str] = []
    missing: list[str] = []

    # Weighted criteria. Each contributes to a 0-100 "criteria match".
    # income-to-rent: 40, documents: 30, employment: 15, occupancy fit: 10, lifestyle: 5
    score = 0.0

    rent = req.room.monthlyRent or 1.0
    income = req.applicant.monthlyIncome or 0.0
    ratio = income / rent if rent else 0.0
    if income <= 0:
        warnings.append("No income information provided.")
        # neutral-low contribution
        score += 8
    elif ratio >= 3:
        score += 40
        reasons.append(f"Income is {ratio:.1f}x rent (meets the 3x guideline).")
    elif ratio >= 2.5:
        score += 33
        reasons.append(f"Income is {ratio:.1f}x rent (close to the 3x guideline).")
    elif ratio >= 2:
        score += 24
        reasons.append(f"Income is {ratio:.1f}x rent (meets the 2x minimum).")
    elif ratio >= 1.5:
        score += 12
        warnings.append(f"Income is only {ratio:.1f}x rent (below the 2x minimum).")
    else:
        score += 4
        warnings.append(f"Income is only {ratio:.1f}x rent (well below guideline).")

    provided = {d.upper() for d in req.providedDocuments}
    required = [d.upper() for d in req.requiredDocuments] or ["ID_PROOF", "ADDRESS_PROOF", "INCOME_PROOF"]
    present = [d for d in required if d in provided]
    missing = [d for d in required if d not in provided]
    if required:
        doc_fraction = len(present) / len(required)
        score += 30 * doc_fraction
        if not missing:
            reasons.append("All required documents were provided.")
        else:
            warnings.append(f"Missing required documents: {', '.join(missing)}.")

    emp = (req.applicant.employmentStatus or "").lower()
    if any(k in emp for k in ("employ", "salaried", "full-time", "full time", "permanent")):
        score += 15
        reasons.append("Applicant reports stable employment.")
    elif any(k in emp for k in ("self-employ", "self employ", "business", "freelance", "contract")):
        score += 10
        reasons.append("Applicant reports self-employment / contract work.")
    elif any(k in emp for k in ("student", "unemployed", "retired", "between jobs")):
        score += 4
        warnings.append(f"Employment status '{req.applicant.employmentStatus}' may need a guarantor.")
    else:
        score += 6

    if req.applicant.occupants <= req.room.capacity:
        score += 10
        if req.applicant.occupants <= req.room.roommatesLimit:
            reasons.append(
                f"Requested occupants ({req.applicant.occupants}) fit the room "
                f"(capacity {req.room.capacity}, roommate limit {req.room.roommatesLimit})."
            )
    else:
        warnings.append(
            f"Requested occupants ({req.applicant.occupants}) exceed room capacity ({req.room.capacity})."
        )

    lifestyle = 5.0
    if req.applicant.smoker:
        lifestyle -= 3
        warnings.append("Applicant is a smoker — confirm the property smoking policy.")
    if req.applicant.hasPets:
        lifestyle -= 2
        warnings.append("Applicant has pets — confirm the property pet policy.")
    score += max(0.0, lifestyle)

    final = _clamp(score)
    if final >= 78:
        rec = "STRONG"
    elif final >= 60:
        rec = "MODERATE"
    elif final >= 45:
        rec = "REVIEW"
    else:
        rec = "WEAK"

    if not reasons:
        reasons.append("Limited information available; manual review recommended.")

    return EligibilityResponse(
        source=FALLBACK,
        score=final,
        scoreLabel="Criteria Match",
        recommendation=rec,  # type: ignore[arg-type]
        reasons=reasons,
        warnings=warnings,
        missingRequirements=[d.title().replace("_", " ") for d in missing],
    )


# ---------------------------------------------------------------------------
# Document verification
# ---------------------------------------------------------------------------
def verify_documents(req: DocVerificationRequest) -> DocVerificationResponse:
    provided_types = {d.type.upper() for d in req.documents}
    required = [d.upper() for d in req.requiredDocuments] or ["ID_PROOF", "ADDRESS_PROOF", "INCOME_PROOF"]
    missing = [d for d in required if d not in provided_types]

    inconsistencies: list[str] = []
    extracted: dict[str, str] = {}

    applicant_name = str(req.applicant.get("fullName", "")).strip().lower()
    for doc in req.documents:
        text = (doc.extractedText or "").lower()
        if not text:
            continue
        if applicant_name and applicant_name.split()[0] not in text:
            inconsistencies.append(
                f"Applicant first name not found in {doc.type} ({doc.originalName})."
            )
        # naive field capture
        for key in ("name", "dob", "address", "pan", "aadhaar", "account"):
            if key in text:
                extracted.setdefault(key, "present in " + doc.type)

    if missing:
        status = "INCONSISTENT"
        score = max(20, 75 - len(missing) * 18)
    elif inconsistencies:
        status = "INCONSISTENT"
        score = 55
    else:
        # We can confirm presence but not authenticity without OCR/AI.
        status = "PENDING"
        score = 70

    return DocVerificationResponse(
        source=FALLBACK,
        overallStatus=status,  # type: ignore[arg-type]
        consistencyScore=_clamp(score),
        extractedFields=extracted,
        inconsistencies=inconsistencies,
        missingDocuments=[d.title().replace("_", " ") for d in missing],
        notes=(
            "Rule-based check: verifies document presence and simple name matching only. "
            "Manual verification of authenticity is recommended."
        ),
    )


# ---------------------------------------------------------------------------
# Summaries
# ---------------------------------------------------------------------------
def summarize_application(payload: dict) -> SummaryResponse:
    a = payload.get("applicant", {})
    room = payload.get("room", {})
    elig = payload.get("eligibility", {})
    docs = payload.get("documents", {})

    parts = [f"{a.get('fullName', 'The applicant')} applied for {room.get('name', 'a room')}"]
    if room.get("monthlyRent"):
        parts.append(f"at ₹{room['monthlyRent']:.0f}/month")
    if a.get("monthlyIncome"):
        parts.append(f"reporting an income of ₹{a['monthlyIncome']:.0f}/month")
    if a.get("employmentStatus"):
        parts.append(f"({a['employmentStatus']})")
    summary = ", ".join(parts) + "."
    if elig.get("score") is not None:
        summary += f" Criteria match: {elig['score']}% ({elig.get('recommendation', 'REVIEW')})."

    highlights: list[str] = []
    concerns: list[str] = list(elig.get("warnings", []))
    if a.get("monthlyIncome") and room.get("monthlyRent"):
        r = a["monthlyIncome"] / max(1, room["monthlyRent"])
        highlights.append(f"Income-to-rent ratio: {r:.1f}x")
    if docs.get("provided"):
        highlights.append(f"Documents provided: {', '.join(docs['provided'])}")
    if docs.get("missing"):
        concerns.append(f"Missing: {', '.join(docs['missing'])}")
    if a.get("hasPets"):
        concerns.append("Has pets")
    if a.get("smoker"):
        concerns.append("Smoker")

    return SummaryResponse(
        source=FALLBACK,
        summary=summary,
        highlights=highlights,
        concerns=concerns,
    )


def summarize_lease(payload: dict) -> LeaseSummaryResponse:
    rent = payload.get("monthlyRent", 0)
    food = payload.get("foodCharge", 0)
    dep = payload.get("securityDeposit", 0)
    start = str(payload.get("startDate", ""))[:10]
    end = str(payload.get("endDate", ""))[:10]
    due = payload.get("rentDueDay", 1)

    summary = (
        f"Lease for {payload.get('room', 'the room')} at {payload.get('property', 'the property')} "
        f"running {start} to {end}. Monthly rent ₹{rent:.0f}"
        + (f" plus ₹{food:.0f} food charge" if food else "")
        + f", due on day {due} of each month. Security deposit ₹{dep:.0f}."
    )
    key_points = [
        f"Term: {start} → {end}",
        f"Monthly rent: ₹{rent:.0f}" + (f" (+₹{food:.0f} food)" if food else ""),
        f"Rent due day: {due}",
        f"Security deposit: ₹{dep:.0f}",
    ]
    obligations = [
        "Pay rent by the due day each month",
        "Give notice before vacating as per the agreement",
        "Keep the room and shared areas in good condition",
        "Report maintenance issues promptly",
    ]
    terms = payload.get("terms")
    if terms:
        key_points.append(f"Additional terms: {str(terms)[:300]}")
    return LeaseSummaryResponse(
        source=FALLBACK, summary=summary, keyPoints=key_points, obligations=obligations
    )


# ---------------------------------------------------------------------------
# Maintenance classification
# ---------------------------------------------------------------------------
_RULES: list[tuple[list[str], str, str]] = [
    (["gas leak", "smell of gas", "fire", "smoke", "sparks", "burning smell", "electric shock", "exposed wire", "flooding"], "Safety", "URGENT"),
    (["no water", "burst", "sewage", "overflow", "major leak", "ceiling leak", "water everywhere"], "Plumbing", "HIGH"),
    (["leak", "drip", "tap", "faucet", "toilet", "flush", "drain", "clog", "blocked"], "Plumbing", "MEDIUM"),
    (["no power", "power outage", "no electricity", "breaker trips", "short circuit", "tripping"], "Electrical", "HIGH"),
    (["socket", "switch", "light not working", "bulb", "wiring", "fan not working"], "Electrical", "MEDIUM"),
    (["no cooling", "ac not", "air condition", "heater", "heating", "hvac", "thermostat"], "HVAC", "MEDIUM"),
    (["lock", "door won't", "door broken", "window broken", "broken glass", "can't lock", "security"], "Security", "HIGH"),
    (["fridge", "refrigerator", "stove", "oven", "microwave", "washing machine", "dishwasher", "geyser", "water heater", "appliance"], "Appliance", "MEDIUM"),
    (["cockroach", "rats", "rodent", "termite", "bed bug", "pest", "ants", "mosquito"], "Pest Control", "MEDIUM"),
    (["crack", "wall damage", "ceiling", "plaster", "tile loose", "floor damage", "seepage", "damp", "mould", "mold"], "Structural", "MEDIUM"),
    (["paint", "peeling", "scratch", "cosmetic", "handle loose", "hinge"], "Cosmetic", "LOW"),
    (["internet", "wifi", "wi-fi", "network", "router", "broadband"], "Internet", "MEDIUM"),
]

_URGENCY_BUMP = ["urgent", "emergency", "immediately", "asap", "dangerous", "unsafe", "can't stay", "cannot stay", "child", "elderly"]
_PRIORITY_ORDER = ["LOW", "MEDIUM", "HIGH", "URGENT"]


def classify_maintenance(req: MaintenanceClassifyRequest) -> MaintenanceClassifyResponse:
    text = f"{req.title} {req.description}".lower()

    category = "General"
    priority = "MEDIUM"
    matched: list[str] = []
    for keywords, cat, prio in _RULES:
        hit = next((k for k in keywords if k in text), None)
        if hit:
            category = cat
            priority = prio
            matched.append(hit)
            break

    if any(w in text for w in _URGENCY_BUMP) and priority != "URGENT":
        idx = min(_PRIORITY_ORDER.index(priority) + 1, len(_PRIORITY_ORDER) - 1)
        priority = _PRIORITY_ORDER[idx]
        matched.append("urgency language")

    reasoning = (
        f"Matched keyword(s): {', '.join(matched)} → category '{category}', priority '{priority}'."
        if matched
        else "No category keywords matched; defaulted to General / MEDIUM."
    )
    actions = {
        "Safety": ["Treat as emergency", "Contact tenant to ensure safety", "Dispatch qualified staff immediately"],
        "Plumbing": ["Assign a plumber", "Shut off supply if leaking", "Photograph before/after"],
        "Electrical": ["Assign a licensed electrician", "Advise tenant not to use the circuit", "Photograph before/after"],
        "HVAC": ["Assign HVAC technician", "Check filters and gas", "Schedule within 48 hours"],
        "Security": ["Prioritise same-day fix", "Provide interim security measure", "Verify lock/window operation"],
        "Appliance": ["Diagnose the appliance", "Arrange repair or replacement", "Confirm working with tenant"],
        "Pest Control": ["Schedule pest-control visit", "Advise tenant on preparation", "Plan follow-up treatment"],
        "Structural": ["Inspect on site", "Assess severity", "Plan repair with materials"],
    }.get(category, ["Assign appropriate staff", "Inspect on site", "Document with photos"])

    return MaintenanceClassifyResponse(
        source=FALLBACK,
        category=category,
        priority=priority,  # type: ignore[arg-type]
        reasoning=reasoning,
        suggestedActions=actions,
    )


# ---------------------------------------------------------------------------
# Owner assistant
# ---------------------------------------------------------------------------
def assistant(question: str, context: dict) -> str:
    q = question.lower()
    lines: list[str] = []

    def fmt_money(n: float) -> str:
        return f"₹{n:,.0f}"

    if "overdueRent" in context:
        rows = context["overdueRent"]
        if rows:
            total = sum(r.get("outstanding", 0) for r in rows)
            lines.append(f"Overdue rent — {len(rows)} tenant(s), {fmt_money(total)} outstanding:")
            for r in rows[:10]:
                lines.append(
                    f"- {r['tenant']} ({r['room']}): {fmt_money(r['outstanding'])}, "
                    f"{r['daysLate']} days late (period {r['period']})"
                )
        else:
            lines.append("Overdue rent — none. All tenants are current.")

    if "vacantRooms" in context:
        rows = context["vacantRooms"]
        if rows:
            beds = sum(r.get("vacantBeds", 0) for r in rows)
            empty = sum(1 for r in rows if r.get("occupants", 0) == 0)
            lines.append(f"Rooms with spare beds — {len(rows)} room(s), {beds} bed(s) available; {empty} room(s) completely empty:")
            for r in rows[:15]:
                lines.append(
                    f"- {r['room']} at {r['property']}: "
                    + ("empty" if r.get("occupants", 0) == 0 else "occupied")
                    + f", {r['vacantBeds']} bed(s) free, "
                    f"{fmt_money(r['monthlyRent'])}/mo"
                    + ("" if r.get("applicationsOpen") else " (applications closed)")
                )
        else:
            lines.append("Vacant rooms — none; all rooms are at capacity.")

    if "leasesExpiring" in context:
        rows = context["leasesExpiring"]
        if rows:
            lines.append(f"Leases expiring soon — {len(rows)}:")
            for r in rows[:15]:
                lines.append(
                    f"- {r['tenant']} ({r['room']}): ends {r['endDate']} "
                    f"({r['daysRemaining']} days)"
                )
        else:
            lines.append("Leases expiring soon — none in the next month.")

    if "revenueSummary" in context:
        r = context["revenueSummary"]
        lines.append(
            "Revenue — "
            f"billed {fmt_money(r['totalBilled'])}, "
            f"collected {fmt_money(r['totalCollected'])}, "
            f"outstanding {fmt_money(r['outstanding'])}, "
            f"collected this month {fmt_money(r['collectedThisMonth'])}."
        )

    if "maintenanceFrequency" in context:
        rows = context["maintenanceFrequency"]
        if rows:
            top = rows[0]
            lines.append(
                f"Maintenance frequency — most common issue: {top['category']} "
                f"({top['count']} request(s)). Full breakdown: "
                + ", ".join(f"{r['category']} {r['count']}" for r in rows[:8])
                + "."
            )
        else:
            lines.append("Maintenance frequency — no maintenance requests on record.")

    if "pendingApplications" in context:
        rows = context["pendingApplications"]
        if rows:
            lines.append(f"Applications awaiting your review — {len(rows)}:")
            for r in rows[:10]:
                lines.append(
                    f"- {r['tenant']} for {r['room']}: {r['status']}, "
                    f"AI {r['aiScore']}, recommendation {r['aiRecommendation']}"
                )
        else:
            lines.append("Applications awaiting your review — none.")

    if "occupancyOverview" in context:
        rows = context["occupancyOverview"]
        if rows:
            lines.append("Occupancy by property:")
            for r in rows:
                lines.append(
                    f"- {r['property']}: {r['occupants']}/{r['capacity']} beds "
                    f"({r['occupancyRate']}%)"
                )

    if "activeWarnings" in context:
        rows = context["activeWarnings"]
        if rows:
            lines.append(f"Active warnings — {len(rows)}:")
            for r in rows[:10]:
                who = f" [{r['tenant']}]" if r.get("tenant") else ""
                lines.append(f"- ({r['severity']}) {r['title']}{who}: {r['message']}")
        else:
            lines.append("Active warnings — none.")

    if not lines:
        lines.append(
            "I can answer questions about overdue rent, vacant rooms, expiring leases, "
            "revenue, maintenance frequency, pending applications, occupancy and warnings. "
            "Ask about one of those and I'll pull the figures from your data."
        )

    lines.append("")
    lines.append("Answered from your live database.")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Insights
# ---------------------------------------------------------------------------
def insights(req: InsightsRequest) -> InsightsResponse:
    m = req.metrics
    out_i: list[str] = []
    risks: list[str] = []
    opps: list[str] = []

    occ = (m.get("occupancy") or {})
    rate = occ.get("occupancyRate", 0)
    if rate:
        out_i.append(f"Occupancy is at {rate}% ({occ.get('totalOccupants', 0)}/{occ.get('totalCapacity', 0)} beds).")
    if rate and rate < 70:
        opps.append(f"{occ.get('vacantBeds', 0)} vacant bed(s) — consider opening applications or adjusting rent.")
    if rate and rate >= 95:
        opps.append("Near-full occupancy — you may have room to raise rents at renewal.")

    rev = (m.get("revenue") or {})
    outstanding = rev.get("outstanding", 0)
    if outstanding:
        risks.append(f"{outstanding:,.0f} in outstanding rent across all leases.")
    pay = (m.get("payments") or {})
    if pay.get("overduePayments"):
        risks.append(f"{pay['overduePayments']} payment(s) currently overdue.")
    if pay.get("latePayments"):
        out_i.append(f"{pay['latePayments']} payment(s) have been paid late historically.")

    leases = (m.get("leases") or {})
    if leases.get("expiringSoon"):
        risks.append(f"{leases['expiringSoon']} lease(s) expire within 30 days — start renewals.")

    mnt = (m.get("maintenance") or {})
    if mnt.get("open"):
        out_i.append(f"{mnt['open']} maintenance request(s) open.")
    warn = (m.get("warnings") or {})
    if warn.get("active"):
        risks.append(f"{warn['active']} active warning(s) need attention.")

    apps = (m.get("applications") or {})
    if apps.get("pendingApprovals"):
        opps.append(f"{apps['pendingApprovals']} application(s) awaiting your decision.")

    if not out_i:
        out_i.append("Not enough data yet for insights — add properties, rooms and leases.")

    return InsightsResponse(
        source=FALLBACK,
        insights=out_i,
        risks=risks,
        opportunities=opps,
    )
