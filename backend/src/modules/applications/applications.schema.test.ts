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
});
