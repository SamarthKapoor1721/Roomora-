import { describe, expect, it } from 'vitest';
import { applySchema } from './applications.schema';

const details = {
  roomId: 'room-1',
  applicantName: '  Test Applicant  ',
  dateOfBirth: '2000-02-29',
  currentAddress: '10 Market Road, Delhi',
};

describe('application applicant details', () => {
  it('requires and trims the name, address, and date of birth', () => {
    const parsed = applySchema.parse(details);
    expect(parsed.applicantName).toBe('Test Applicant');
    expect(parsed.currentAddress).toBe(details.currentAddress);
    expect(applySchema.safeParse({ roomId: details.roomId }).success).toBe(false);
  });

  it('rejects impossible and future dates of birth', () => {
    expect(applySchema.safeParse({ ...details, dateOfBirth: '2001-02-29' }).success).toBe(false);
    expect(applySchema.safeParse({ ...details, dateOfBirth: '2999-01-01' }).success).toBe(false);
  });

  it('requires a description and occupant count when family will move in', () => {
    expect(applySchema.safeParse({ ...details, hasFamilyMembers: true, occupants: 1, familyDetails: 'My wife' }).success).toBe(false);
    expect(applySchema.safeParse({ ...details, hasFamilyMembers: true, occupants: 2, familyDetails: 'My spouse will live with me' }).success).toBe(true);
    expect(applySchema.safeParse({ ...details, hasFamilyMembers: false, familyDetails: 'My spouse will live with me' }).success).toBe(false);
  });
});
