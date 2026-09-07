import type { NotificationType } from '@prisma/client';
import { prisma } from './prisma';

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedType?: string;
  relatedId?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({ data: input });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notify] failed', err);
  }
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await prisma.notification.createMany({ data: inputs });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifyMany] failed', err);
  }
}
