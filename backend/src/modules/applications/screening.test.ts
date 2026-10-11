import { describe, expect, it } from 'vitest';
import type { DocVerificationResponse } from '../../lib/aiClient';
import { assessEligibility } from './screening';

const applicant = { monthlyIncome: 90000, occupants: 1 };
const room = { monthlyRent: 15000, capacity: 2, roommatesLimit: 2 };
function review(status: 'VERIFIED' | 'INCONSISTENT' | 'PENDING'): DocVerificationResponse {
  return {
    source: 'NVIDIA_AI', overallStatus: status, consistencyScore: status === 'VERIFIED' ? 100 : 0,
    extractedFields: {}, inconsistencies: [], missingDocuments: [],
    documentResults: ['ID_PROOF', 'ADDRESS_PROOF', 'INCOME_PROOF'].map((type) => ({
      id: type, type, status, reason: status === 'INCONSISTENT' ? 'Random photo, not proof' : 'Content reviewed',
      extractedFields: status === 'VERIFIED' ? { monthlyIncome: 45000 } : {},
    })),
  };
}
describe('document-supported eligibility', () => {
  it('gives random photos no document or income credit despite high declared income', () => {
    const result = assessEligibility(applicant, room, review('INCONSISTENT'));
    expect(result.score).toBe(20);
    expect(result.recommendation).toBe('REVIEW');
    expect(result.missingRequirements).toHaveLength(3);
  });
  it('requires review when the AI service cannot inspect the files', () => {
    const result = assessEligibility(applicant, room, review('PENDING'));
    expect(result.score).toBe(20);
    expect(result.recommendation).toBe('REVIEW');
  });
  it('uses extracted income instead of the self-reported amount', () => {
    const result = assessEligibility(applicant, { ...room, monthlyRent: 30000 }, review('VERIFIED'));
    expect(result.score).toBe(65);
    expect(result.recommendation).toBe('MODERATE');
  });
  it('cannot give a strong score when any required proof is invalid', () => {
    const docs = review('VERIFIED');
    docs.documentResults![1].status = 'INCONSISTENT';
    const result = assessEligibility(applicant, room, docs);
    expect(result.score).toBeLessThanOrEqual(39);
    expect(result.recommendation).toBe('REVIEW');
  });
  it('checks the roommate limit as well as capacity', () => {
    const result = assessEligibility({ ...applicant, occupants: 2 }, { ...room, roommatesLimit: 1 }, review('VERIFIED'));
    expect(result.score).toBe(80);
    expect(result.warnings.join(' ')).toContain('occupancy limit');
  });
});
