import type { DocVerificationResponse, EligibilityResponse } from '../../lib/aiClient';
import { REQUIRED_DOCUMENTS } from './applications.schema';

/** Transparent evidence-based criteria; an upload label never earns points. */
export function assessEligibility(
  applicant: { monthlyIncome: number | null; occupants: number; hasFamilyMembers?: boolean; familyDetails?: string | null },
  room: { monthlyRent: number; capacity: number; roommatesLimit: number },
  review: DocVerificationResponse,
): EligibilityResponse {
  const results = review.documentResults ?? [];
  const passed = results.filter((doc) => doc.status === 'VERIFIED');
  const verified = new Set(passed.map((doc) => doc.type));
  const missing = REQUIRED_DOCUMENTS.filter((type) => !verified.has(type));
  const reasons: string[] = [];
  const warnings = results.filter((doc) => doc.status !== 'VERIFIED').map((doc) => `${doc.type}: ${doc.reason}`);
  const matchingNames = REQUIRED_DOCUMENTS.filter((type) => passed.some((doc) => doc.type === type && doc.fieldChecks?.name === 'MATCH')).length;
  const addressMatched = passed.some((doc) => doc.type === 'ADDRESS_PROOF' && doc.fieldChecks?.address === 'MATCH');
  const dobMatched = passed.some((doc) => doc.type === 'ID_PROOF' && doc.fieldChecks?.dateOfBirth === 'MATCH');
  let score = 20 * matchingNames / REQUIRED_DOCUMENTS.length + (addressMatched ? 20 : 0) + (dobMatched ? 20 : 0);
  score += 10 * (REQUIRED_DOCUMENTS.length - missing.length) / REQUIRED_DOCUMENTS.length;
  reasons.push(`Applicant details: name matched on ${matchingNames}/${REQUIRED_DOCUMENTS.length} required proofs (20 points), address ${addressMatched ? 'matched' : 'not confirmed'} (20 points), date of birth ${dobMatched ? 'matched' : 'not confirmed'} (20 points).`);
  reasons.push(`${REQUIRED_DOCUMENTS.length - missing.length}/${REQUIRED_DOCUMENTS.length} required proofs passed content checks (10 points maximum).`);
  if (!addressMatched) warnings.push('Application address needs manual comparison with address proof.');
  if (!dobMatched) warnings.push('Application date of birth needs manual comparison with identity proof.');

  const incomeProof = results.find((doc) => doc.type === 'INCOME_PROOF' && doc.status === 'VERIFIED');
  const income = Number(incomeProof?.extractedFields.monthlyIncome);
  let affordabilityConcern = false;
  if (incomeProof && Number.isFinite(income) && income > 0 && room.monthlyRent > 0) {
    const ratio = income / room.monthlyRent;
    affordabilityConcern = ratio < 2;
    score += ratio >= 3 ? 20 : ratio >= 2.5 ? 16 : ratio >= 2 ? 12 : ratio >= 1.5 ? 6 : 0;
    reasons.push(`Document-supported monthly income is ${ratio.toFixed(1)}× rent (20 points maximum).`);
    if (ratio < 2) warnings.push('Document-supported income is below the 2× rent guideline.');
  } else {
    warnings.push('Declared income is unverified and earns no affordability points.');
  }
  const limit = Math.min(room.capacity, room.roommatesLimit);
  if (applicant.occupants <= limit) {
    score += 10;
    reasons.push(`Requested occupants fit the room capacity and roommate limit (${limit}; 10 points).`);
  } else warnings.push(`Requested occupants exceed the room's occupancy limit (${limit}).`);

  const familyDescription = applicant.familyDetails?.trim() ?? '';
  const identifiesRelation = /\b(spouse|wife|husband|partner|son|daughter|child|children|mother|mum|mom|father|dad|parent|parents|sister|brother|grandparent|grandmother|grandfather|aunt|uncle|cousin|niece|nephew|relative|relatives|family)\b/i.test(familyDescription);
  if (applicant.hasFamilyMembers && applicant.occupants > 1 && applicant.occupants <= limit && familyDescription.length >= 10 && identifiesRelation && missing.length === 0) {
    score += 5;
    reasons.push('Family or relative household members were described and included in the room occupancy count (5 disclosure points; details are self-reported).');
  } else if (applicant.hasFamilyMembers && !identifiesRelation) {
    warnings.push('Family details do not clearly identify who else will live in the room; owner review recommended.');
  }

  if (missing.length) warnings.push(`Valid proofs still needed: ${missing.join(', ')}. Manual review required.`);
  const invalid = results.some((doc) => doc.status === 'INCONSISTENT');
  const unconfirmed = results.some((doc) => doc.status !== 'VERIFIED');
  const detailIncomplete = matchingNames < REQUIRED_DOCUMENTS.length || !addressMatched || !dobMatched;
  if (detailIncomplete) warnings.push('One or more applicant details were not confirmed; manual review required.');
  score = Math.round(Math.max(0, Math.min(score, invalid ? 39 : missing.length || detailIncomplete || unconfirmed ? 54 : applicant.occupants > limit ? 69 : 100)));
  return {
    source: 'RULE_BASED_FALLBACK', score, scoreLabel: 'Evidence-based criteria match',
    recommendation: missing.length || invalid || detailIncomplete || unconfirmed || applicant.occupants > limit ? 'REVIEW' : score >= 78 && !affordabilityConcern ? 'STRONG' : score >= 60 ? 'MODERATE' : 'WEAK',
    reasons, warnings, missingRequirements: [...missing],
  };
}
