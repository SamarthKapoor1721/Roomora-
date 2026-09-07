import type { Request } from 'express';
import { prisma } from './prisma';

interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/** Fire-and-forget audit log. Never throws into the request path. */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? input.req?.user?.id ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        ip: input.req?.ip,
        userAgent: input.req?.get('user-agent') ?? undefined,
        metadata: input.metadata as never,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] failed to write log', err);
  }
}
