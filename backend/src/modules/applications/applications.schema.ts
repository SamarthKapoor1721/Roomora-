import { z } from 'zod';

export const DOCUMENT_TYPES = [
  'ID_PROOF',
  'ADDRESS_PROOF',
  'INCOME_PROOF',
  'EMPLOYMENT_LETTER',
  'BANK_STATEMENT',
  'PHOTO',
  'OTHER',
] as const;

/** Documents an applicant is expected to provide for a standard application. */
export const REQUIRED_DOCUMENTS = ['ID_PROOF', 'ADDRESS_PROOF', 'INCOME_PROOF'] as const;

const applicationFields = z.object({
  roomId: z.string().min(1),
  applicantName: z.string().trim().min(2).max(120),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date of birth').refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value) && value < new Date().toISOString().slice(0, 10);
  }, 'Enter a valid past date of birth'),
  monthlyIncome: z.number().nonnegative().max(100_000_000).optional(),
  employmentStatus: z.string().max(80).optional(),
  employerName: z.string().max(160).optional(),
  currentAddress: z.string().trim().min(5).max(400),
  moveInDate: z.coerce.date().optional(),
  occupants: z.number().int().min(1).max(20).default(1),
  hasFamilyMembers: z.boolean().default(false),
  familyDetails: z.string().trim().max(2000).optional(),
  hasPets: z.boolean().default(false),
  smoker: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  foodOptIn: z.boolean().default(false),
});

export const applySchema = applicationFields.superRefine((input, ctx) => {
  if (input.hasFamilyMembers && (!input.familyDetails || input.familyDetails.length < 10)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['familyDetails'], message: 'Describe who will live with you (at least 10 characters)' });
  }
  if (input.hasFamilyMembers && input.occupants < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['occupants'], message: 'Include family members in the number of occupants' });
  }
  if (!input.hasFamilyMembers && input.familyDetails) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['familyDetails'], message: 'Select the family members checkbox to add these details' });
  }
});

export const updateApplicationSchema = applicationFields.omit({ roomId: true }).partial();

export const uploadDocMetaSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
});

export const decisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(2000).optional(),
  // For approvals: which room to assign to (defaults to the applied room),
  // and lease terms.
  lease: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      rentDueDay: z.number().int().min(1).max(28).default(1),
      monthlyRent: z.number().positive().optional(),
      foodOptIn: z.boolean().optional(),
      terms: z.string().max(8000).optional(),
    })
    .optional(),
});

export const listApplicationsQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z
    .enum([
      'DRAFT',
      'SUBMITTED',
      'DOCS_PENDING',
      'UNDER_AI_REVIEW',
      'AI_COMPLETE',
      'OWNER_REVIEW',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
    ])
    .optional(),
  roomId: z.string().optional(),
  propertyId: z.string().optional(),
});

export const idParam = z.object({ id: z.string().min(1) });
export const docParam = z.object({ id: z.string().min(1), docId: z.string().min(1) });
