import type { DocVerificationResponse, EligibilityResponse } from '../../lib/aiClient';
import { REQUIRED_DOCUMENTS } from './applications.schema';

/** Transparent evidence-based criteria; an upload label never earns points. */
export function assessEligibility(
  applicant: { monthlyIncome: number | null; occupants: number },
  room: { monthlyRent: number; capacity: number; roommatesLimit: number },
  review: DocVerificationResponse,
): EligibilityResponse {
  const results = review.documentResults ?? [];
  const verified = new Set(results.filter((doc) => doc.status === 'VERIFIED').map((doc) => doc.type));
  const missing = REQUIRED_DOCUMENTS.filter((type) => !verified.has(type));
  const reasons: string[] = [];
  const warnings = results.filter((doc) => doc.status !== 'VERIFIED').map((doc) => `${doc.type}: ${doc.reason}`);
  let score = 30 * (REQUIRED_DOCUMENTS.length - missing.length) / REQUIRED_DOCUMENTS.length;
  reasons.push(`${REQUIRED_DOCUMENTS.length - missing.length}/${REQUIRED_DOCUMENTS.length} required proofs passed content checks (30 points maximum).`);

  const incomeProof = results.find((doc) => doc.type === 'INCOME_PROOF' && doc.status === 'VERIFIED');
  const income = Number(incomeProof?.extractedFields.monthlyIncome);
  if (incomeProof && Number.isFinite(income) && income > 0 && room.monthlyRent > 0) {
    const ratio = income / room.monthlyRent;
    score += ratio >= 3 ? 50 : ratio >= 2.5 ? 40 : ratio >= 2 ? 30 : ratio >= 1.5 ? 15 : 0;
    reasons.push(`Document-supported monthly income is ${ratio.toFixed(1)}× rent (50 points maximum).`);
    if (ratio < 2) warnings.push('Document-supported income is below the 2× rent guideline.');
  } else {
    warnings.push('Declared income is unverified and earns no affordability points.');
  }
  const limit = Math.min(room.capacity, room.roommatesLimit);
  if (applicant.occupants <= limit) {
    score += 20;
    reasons.push(`Requested occupants fit the room capacity and roommate limit (${limit}; 20 points).`);
  } else warnings.push(`Requested occupants exceed the room's occupancy limit (${limit}).`);

  if (missing.length) warnings.push(`Valid proofs still needed: ${missing.join(', ')}. Manual review required.`);
  const invalid = results.some((doc) => REQUIRED_DOCUMENTS.includes(doc.type as typeof REQUIRED_DOCUMENTS[number]) && doc.status === 'INCONSISTENT');
  score = Math.round(Math.max(0, Math.min(score, invalid ? 39 : missing.length ? 54 : 100)));
  return {
    source: 'RULE_BASED_FALLBACK', score, scoreLabel: 'Evidence-based criteria match',
    recommendation: missing.length || invalid || applicant.occupants > limit ? 'REVIEW' : score >= 78 ? 'STRONG' : score >= 60 ? 'MODERATE' : 'WEAK',
    reasons, warnings, missingRequirements: [...missing],
  };
}
