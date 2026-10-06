import fs from 'node:fs';
import type { Prisma } from '@prisma/client';
import { ownerApplicationOrThrow } from '../../lib/access';
import { aiClient } from '../../lib/aiClient';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { notify } from '../../lib/notify';
import { parsePage } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { effectiveFood } from '../rooms/rooms.service';
import { assignmentsService } from '../assignments/assignments.service';
import { REQUIRED_DOCUMENTS } from './applications.schema';

const ACTIVE_STATUSES: Prisma.ApplicationWhereInput['status'][] = [
  'SUBMITTED',
  'DOCS_PENDING',
  'UNDER_AI_REVIEW',
  'AI_COMPLETE',
  'OWNER_REVIEW',
];

export const applicationsService = {
  // ---------- Tenant actions ----------
  async apply(tenantId: string, input: Record<string, unknown>) {
    const room = await prisma.room.findUnique({
      where: { id: input.roomId as string },
      include: { property: true },
    });
    if (!room) throw notFound('Room not found');
    if (!room.applicationsOpen) throw conflict('Applications are not open for this room');
    if (room.status === 'INACTIVE') throw conflict('This room is not available');

    const existing = await prisma.application.findFirst({
      where: {
        tenantId,
        roomId: room.id,
        status: { in: ACTIVE_STATUSES as never },
      },
    });
    if (existing) throw conflict('You already have an active application for this room');

    const alreadyAssigned = await prisma.roomAssignment.findFirst({
      where: { tenantId, roomId: room.id, isActive: true },
    });
    if (alreadyAssigned) throw conflict('You are already assigned to this room');

    if ((input.occupants as number) > room.capacity) {
      throw badRequest(`Requested occupants exceed room capacity (${room.capacity})`);
    }

    const food = effectiveFood(room, room.property);
    const foodOptIn = food.foodEnabled ? Boolean(input.foodOptIn) : false;

    const application = await prisma.application.create({
      data: {
        roomId: room.id,
        tenantId,
        status: 'DOCS_PENDING',
        monthlyIncome: (input.monthlyIncome as number) ?? null,
        employmentStatus: (input.employmentStatus as string) ?? null,
        employerName: (input.employerName as string) ?? null,
        currentAddress: (input.currentAddress as string) ?? null,
        moveInDate: (input.moveInDate as Date) ?? null,
        occupants: (input.occupants as number) ?? 1,
        hasPets: Boolean(input.hasPets),
        smoker: Boolean(input.smoker),
        notes: (input.notes as string) ?? null,
        foodOptIn,
        submittedAt: new Date(),
      },
    });

    await notify({
      userId: room.property.ownerId,
      type: 'APPLICATION_UPDATE',
      title: 'New tenant application',
      body: `A tenant applied for ${room.name}. Awaiting documents.`,
      relatedType: 'APPLICATION',
      relatedId: application.id,
    });

    return application;
  },

  async updateDraft(tenantId: string, id: string, input: Record<string, unknown>) {
    const app = await this.tenantAppOrThrow(tenantId, id);
    if (!['DOCS_PENDING', 'SUBMITTED'].includes(app.status)) {
      throw conflict('Application can no longer be edited');
    }
    return prisma.application.update({ where: { id }, data: input as never });
  },

  async withdraw(tenantId: string, id: string) {
    const app = await this.tenantAppOrThrow(tenantId, id);
    if (['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(app.status)) {
      throw conflict('Application is already finalised');
    }
    return prisma.application.update({ where: { id }, data: { status: 'WITHDRAWN' } });
  },

  async addDocument(
    tenantId: string,
    id: string,
    file: Express.Multer.File,
    type: string,
    relPath: string,
  ) {
    const app = await this.tenantAppOrThrow(tenantId, id);
    if (['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(app.status)) {
      // clean up the just-uploaded file
      fs.promises.unlink(file.path).catch(() => undefined);
      throw conflict('Cannot add documents to a finalised application');
    }
    return prisma.applicationDocument.create({
      data: {
        applicationId: id,
        type: type as never,
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        path: relPath,
      },
    });
  },

  async removeDocument(tenantId: string, id: string, docId: string) {
    const app = await this.tenantAppOrThrow(tenantId, id);
    if (['UNDER_AI_REVIEW', 'AI_COMPLETE', 'OWNER_REVIEW', 'APPROVED', 'REJECTED'].includes(app.status)) {
      throw conflict('Documents are locked once screening has started');
    }
    const doc = await prisma.applicationDocument.findFirst({ where: { id: docId, applicationId: id } });
    if (!doc) throw notFound('Document not found');
    await prisma.applicationDocument.delete({ where: { id: docId } });
  },

  /** Tenant submits for AI screening once documents are uploaded. */
  async submitForScreening(tenantId: string, id: string) {
    const app = await prisma.application.findFirst({
      where: { id, tenantId },
      include: { documents: true, room: { include: { property: true } } },
    });
    if (!app) throw notFound('Application not found');
    if (!['DOCS_PENDING', 'SUBMITTED'].includes(app.status)) {
      throw conflict(`Application cannot be screened from status ${app.status}`);
    }
    const providedTypes = new Set(app.documents.map((d) => d.type));
    const missing = REQUIRED_DOCUMENTS.filter((r) => !providedTypes.has(r as never));
    if (missing.length > 0) {
      throw badRequest(`Upload all required documents before screening. Missing: ${missing.join(', ')}`);
    }

    await prisma.application.update({ where: { id }, data: { status: 'UNDER_AI_REVIEW' } });

    // Run AI screening (eligibility + doc verification + summary). Non-blocking
    // for the request would need a queue; here we await but each call has its
    // own fallback so it always resolves quickly enough.
    await runAiScreening(id);

    return prisma.application.findUnique({
      where: { id },
      include: { eligibility: true, docVerification: true, summary: true },
    });
  },

  // ---------- Tenant reads ----------
  async listForTenant(tenantId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.ApplicationWhereInput = { tenantId };
    if (query.status) where.status = query.status as never;

    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          room: { include: { property: { select: { name: true, city: true } } } },
          eligibility: { select: { source: true, score: true, scoreLabel: true, recommendation: true } },
          docVerification: { select: { source: true, overallStatus: true, consistencyScore: true } },
          _count: { select: { documents: true } },
        },
      }),
      prisma.application.count({ where }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  async getForTenant(tenantId: string, id: string) {
    const app = await prisma.application.findFirst({
      where: { id, tenantId },
      include: {
        room: { include: { property: true } },
        documents: true,
        eligibility: true,
        docVerification: true,
        summary: true,
        assignments: { take: 1 },
      },
    });
    if (!app) throw notFound('Application not found');
    const { assignments, ...result } = app;
    return { ...result, assignment: assignments[0] ?? null };
  },

  // ---------- Owner reads ----------
  async listForOwner(ownerId: string, query: Record<string, unknown>) {
    const { skip, take, page, pageSize } = parsePage(query);
    const where: Prisma.ApplicationWhereInput = { room: { property: { ownerId } } };
    if (query.status) where.status = query.status as never;
    if (query.roomId) where.roomId = query.roomId as string;
    if (query.propertyId) where.room = { property: { ownerId }, propertyId: query.propertyId as string };

    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          tenant: { select: { id: true, fullName: true, email: true, phone: true } },
          room: { include: { property: { select: { id: true, name: true } } } },
          eligibility: true,
          docVerification: true,
          summary: true,
          _count: { select: { documents: true } },
        },
      }),
      prisma.application.count({ where }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  async getForOwner(ownerId: string, id: string) {
    return ownerApplicationOrThrow(ownerId, id);
  },

  /** Owner can re-trigger AI screening (advisory only). */
  async rerunAi(ownerId: string, id: string) {
    const app = await ownerApplicationOrThrow(ownerId, id);
    if (['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(app.status)) {
      throw conflict('Cannot rescreen a finalised application');
    }
    await runAiScreening(id);
    return prisma.application.findUnique({
      where: { id },
      include: { eligibility: true, docVerification: true, summary: true },
    });
  },

  /**
   * Owner's manual decision. This is the ONLY place an application is approved
   * or rejected. AI never calls this.
   */
  async decide(ownerId: string, id: string, input: Record<string, unknown>) {
    const app = await ownerApplicationOrThrow(ownerId, id);
    if (['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(app.status)) {
      throw conflict(`Application already ${app.status.toLowerCase()}`);
    }

    if (input.decision === 'REJECT') {
      const updated = await prisma.application.update({
        where: { id },
        data: {
          status: 'REJECTED',
          decidedAt: new Date(),
          decidedById: ownerId,
          decisionReason: (input.reason as string) ?? null,
        },
      });
      await notify({
        userId: app.tenantId,
        type: 'APPLICATION_UPDATE',
        title: 'Application decision',
        body: `Your application for ${app.room.name} was not approved.${input.reason ? ` Reason: ${input.reason}` : ''}`,
        relatedType: 'APPLICATION',
        relatedId: id,
      });
      return { application: updated };
    }

    // APPROVE -> assign tenant to room + create lease
    const lease = input.lease as
      | { startDate: Date; endDate: Date; rentDueDay: number; monthlyRent?: number; foodOptIn?: boolean; terms?: string }
      | undefined;
    if (!lease) throw badRequest('Lease details are required to approve an application');
    if (lease.endDate <= lease.startDate) throw badRequest('Lease end date must be after start date');

    const result = await assignmentsService.assignFromApplication(ownerId, {
      applicationId: id,
      lease,
    });

    await notify({
      userId: app.tenantId,
      type: 'APPLICATION_UPDATE',
      title: 'Application approved',
      body: `Your application for ${app.room.name} was approved. You have been assigned to the room.`,
      relatedType: 'APPLICATION',
      relatedId: id,
    });

    return result;
  },

  // ---------- helpers ----------
  async tenantAppOrThrow(tenantId: string, id: string) {
    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw notFound('Application not found');
    if (app.tenantId !== tenantId) throw forbidden('This is not your application');
    return app;
  },
};

/**
 * Runs the three advisory AI steps and persists results. Each aiClient call
 * degrades to a rule-based fallback on failure, so this never throws for AI
 * reasons. On completion the application moves to OWNER_REVIEW — never
 * auto-approved or auto-rejected.
 */
export async function runAiScreening(applicationId: string): Promise<void> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      tenant: true,
      room: { include: { property: true } },
      documents: true,
    },
  });
  if (!app) return;

  const providedDocs = app.documents.map((d) => d.type);
  const room = app.room;

  // NVIDIA's public tier throttles bursts; a small gap between the three
  // sequential calls reduces 429/503s.
  const gap = () => new Promise((r) => setTimeout(r, 800));

  // 1. Eligibility (advisory score / criteria match)
  const eligibility = await aiClient.eligibility({
    applicant: {
      fullName: app.tenant.fullName,
      monthlyIncome: app.monthlyIncome ? Number(app.monthlyIncome) : null,
      employmentStatus: app.employmentStatus,
      employerName: app.employerName,
      occupants: app.occupants,
      hasPets: app.hasPets,
      smoker: app.smoker,
      notes: app.notes,
    },
    room: {
      name: room.name,
      monthlyRent: Number(room.monthlyRent),
      capacity: room.capacity,
      roommatesLimit: room.roommatesLimit,
      foodEnabled: room.foodEnabled || room.property.foodEnabled,
    },
    requiredDocuments: [...REQUIRED_DOCUMENTS],
    providedDocuments: providedDocs,
  });

  await prisma.eligibilityAssessment.upsert({
    where: { applicationId },
    create: {
      applicationId,
      source: eligibility.source,
      score: eligibility.score,
      scoreLabel: eligibility.scoreLabel,
      recommendation: eligibility.recommendation,
      reasons: eligibility.reasons,
      warnings: eligibility.warnings,
      missingRequirements: eligibility.missingRequirements,
      rawResponse: eligibility.raw as never,
      model: eligibility.model,
    },
    update: {
      source: eligibility.source,
      score: eligibility.score,
      scoreLabel: eligibility.scoreLabel,
      recommendation: eligibility.recommendation,
      reasons: eligibility.reasons,
      warnings: eligibility.warnings,
      missingRequirements: eligibility.missingRequirements,
      rawResponse: eligibility.raw as never,
      model: eligibility.model,
    },
  });

  await gap();

  // 2. Document verification (extraction + consistency)
  const docVerify = await aiClient.verifyDocuments({
    applicant: {
      fullName: app.tenant.fullName,
      currentAddress: app.currentAddress,
      monthlyIncome: app.monthlyIncome ? Number(app.monthlyIncome) : null,
    },
    documents: app.documents.map((d) => ({ type: d.type, originalName: d.originalName })),
    requiredDocuments: [...REQUIRED_DOCUMENTS],
  });

  await prisma.docVerificationResult.upsert({
    where: { applicationId },
    create: {
      applicationId,
      source: docVerify.source,
      overallStatus: docVerify.overallStatus,
      consistencyScore: docVerify.consistencyScore,
      extractedFields: docVerify.extractedFields as never,
      inconsistencies: docVerify.inconsistencies,
      missingDocuments: docVerify.missingDocuments,
      notes: docVerify.notes,
      rawResponse: docVerify.raw as never,
      model: docVerify.model,
    },
    update: {
      source: docVerify.source,
      overallStatus: docVerify.overallStatus,
      consistencyScore: docVerify.consistencyScore,
      extractedFields: docVerify.extractedFields as never,
      inconsistencies: docVerify.inconsistencies,
      missingDocuments: docVerify.missingDocuments,
      notes: docVerify.notes,
      rawResponse: docVerify.raw as never,
      model: docVerify.model,
    },
  });

  // Reflect per-document status where we can
  if (docVerify.overallStatus === 'INCONSISTENT') {
    await prisma.applicationDocument.updateMany({
      where: { applicationId, verification: 'PENDING' },
      data: { verification: 'INCONSISTENT' },
    });
  }

  await gap();

  // 3. Application summary
  const summary = await aiClient.summarizeApplication({
    applicant: {
      fullName: app.tenant.fullName,
      email: app.tenant.email,
      monthlyIncome: app.monthlyIncome ? Number(app.monthlyIncome) : null,
      employmentStatus: app.employmentStatus,
      employerName: app.employerName,
      occupants: app.occupants,
      hasPets: app.hasPets,
      smoker: app.smoker,
      notes: app.notes,
    },
    room: { name: room.name, monthlyRent: Number(room.monthlyRent) },
    eligibility: { score: eligibility.score, recommendation: eligibility.recommendation, warnings: eligibility.warnings },
    documents: { provided: providedDocs, missing: eligibility.missingRequirements },
  });

  await prisma.applicationSummary.upsert({
    where: { applicationId },
    create: {
      applicationId,
      source: summary.source,
      summary: summary.summary,
      highlights: summary.highlights,
      concerns: summary.concerns,
      model: summary.model,
    },
    update: {
      source: summary.source,
      summary: summary.summary,
      highlights: summary.highlights,
      concerns: summary.concerns,
      model: summary.model,
    },
  });

  // Hand off to the owner. AI results are advisory; owner decides.
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: 'OWNER_REVIEW' },
  });

  await notify({
    userId: room.property.ownerId,
    type: 'APPLICATION_UPDATE',
    title: 'AI screening complete',
    body: `AI screening finished for an application on ${room.name}. Review and make your decision.`,
    relatedType: 'APPLICATION',
    relatedId: applicationId,
  });
}
