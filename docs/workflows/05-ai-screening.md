# 05 · AI screening

Screening runs when a tenant submits documents or an owner chooses **Re-run AI**.
The owner always makes the final decision.

## Document inspection comes first

The backend reads each uploaded PDF from private storage and sends its bytes,
document ID, declared type, MIME type, and applicant details to the AI service.
PyMuPDF extracts embedded text from up to six pages. Image pages with little or
no embedded text are transcribed with the configured NVIDIA vision model
(`NVIDIA_NIM_VISION_MODEL`). The extracted or transcribed text is then sent to
the language model (`NVIDIA_NIM_MODEL`) for review. Encrypted, oversized, blank,
or still unreadable PDFs require manual review. Filenames and upload labels
never count as proof. Text review cannot establish signatures, visual layout,
or document authenticity.

The model checks whether the text matches the requested proof type and extracts
identity, address, date of birth, and income fields. The service checks the
extracted name and evidence against the PDF text, then compares name, address,
and date of birth with the information supplied on the application. Missing or
conflicting details are sent to the owner for manual review.
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
| Matching applicant name | 20 | Up to 20 across the three required proofs |
| Matching residential address | 20 | Address proof agrees with the application |
| Matching date of birth | 20 | Identity proof agrees with the application |
| Affordability | 20 | Document income ≥3× rent: 20, ≥2.5×: 16, ≥2×: 12, ≥1.5×: 6, below: 0 |
| Required proofs | 10 | Valid ID, address, and income proofs |
| Occupancy | 10 | Requested occupants fit capacity and roommate limit |

Self-reported income earns no affordability points. Employment claims, pets,
and smoking do not add or subtract points. Any inconsistent proof caps the score
at 39; incomplete proofs, unconfirmed documents, or unconfirmed applicant
details cap it at 54. These force `REVIEW`, as does an occupancy mismatch
(which caps the score at 69).
Otherwise ≥78 gives `STRONG`, ≥60 `MODERATE`, below `WEAK`; income below twice
the rent limits the recommendation to `MODERATE`.
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
