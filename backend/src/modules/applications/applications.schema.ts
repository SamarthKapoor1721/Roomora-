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

export const applySchema = z.object({
  roomId: z.string().min(1),
  monthlyIncome: z.number().nonnegative().max(100_000_000).optional(),
  employmentStatus: z.string().max(80).optional(),
  employerName: z.string().max(160).optional(),
  currentAddress: z.string().max(400).optional(),
  moveInDate: z.coerce.date().optional(),
  occupants: z.number().int().min(1).max(20).default(1),
  hasPets: z.boolean().default(false),
  smoker: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  foodOptIn: z.boolean().default(false),
});

export const updateApplicationSchema = applySchema.omit({ roomId: true }).partial();

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
