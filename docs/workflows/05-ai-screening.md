# 05 · AI screening

Screening runs when a tenant submits documents or an owner chooses **Re-run AI**.
The owner always makes the final decision.

## Document inspection comes first

The backend reads each uploaded file from private storage and sends its bytes,
document ID, declared type, MIME type, and applicant details to the AI service.
Images and PDF pages are rendered as bounded JPEG images and inspected by the
configured NVIDIA vision model (`NVIDIA_NIM_VISION_MODEL`). PDF files with more
than six pages, encrypted PDFs, unsupported images, or unreadable files require
manual review. Filenames and upload labels never count as proof.

The model checks whether the visible content matches the requested proof type,
extracts identity/address/income fields, and compares them with applicant details.
Income proofs require a visible name, amount, currency, and income period;
address proofs require a visible name and address; identity proofs require a
name and identifier. Income mismatches over 5% are flagged independently of the
model's consistency judgement. Unknown currencies require manual review.

Each file receives `VERIFIED`, `INCONSISTENT`, `UNREADABLE`, or `PENDING`, with an
explanation and extracted fields. Re-screening replaces stale per-file results.
`VERIFIED` means content and applicant consistency, not established authenticity.
The displayed proof percentage is the fraction of required types that passed.

An unavailable vision API or AI service never grants verification credit.
Documents remain pending/unreadable and require manual review.

## Evidence-based eligibility

The backend computes a transparent score after document inspection:

| Criterion | Maximum points | Evidence |
| --- | --- | --- |
| Affordability | 50 | Monthly income extracted from a valid income proof; ≥3× rent: 50, ≥2.5×: 40, ≥2×: 30, ≥1.5×: 15, below: 0 |
| Required proofs | 30 | 10 each for valid ID, address, and income proofs |
| Occupancy | 20 | Requested occupants fit both capacity and roommate limit |

Self-reported income earns no affordability points. Employment claims, pets,
and smoking do not add or subtract points. Invalid required proofs cap the score
at 39; incomplete/unverified proofs cap it at 54. Both force `REVIEW`, as does an
occupancy mismatch. Otherwise ≥78 gives `STRONG`, ≥60 `MODERATE`, below `WEAK`.
This is an advisory criteria match, never a probability of approval.
The score uses deterministic rules (`source: RULE_BASED_FALLBACK`) even when the
underlying document inspection uses NVIDIA AI.

## Summary and handoff

The summary receives document results and evidence-based eligibility warnings.
It must distinguish self-reported values from document-supported facts and include
invalid or unavailable proof checks in concerns. The application then moves to
`OWNER_REVIEW` and notifies the owner. Documents are locked after submission.

Older scores are shown as **Needs re-screening**. The owner can use **Re-run AI**
to refresh a non-finalised application. Finalised applications cannot be re-run.
