import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { asyncHandler, ok } from '../../lib/http';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { aiLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { assistantService } from './assistant.service';

const askSchema = z.object({
  question: z.string().min(3).max(2000).trim(),
  conversationId: z.string().optional(),
});
const idParam = z.object({ id: z.string().min(1) });

export const assistantRoutes = Router();
assistantRoutes.use(authenticate, authorize('OWNER'));

assistantRoutes.get(
  '/conversations',
  asyncHandler(async (req, res) => ok(res, await assistantService.listConversations(req.user!.id))),
);
assistantRoutes.get(
  '/conversations/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => ok(res, await assistantService.getConversation(req.user!.id, req.params.id))),
);
assistantRoutes.delete(
  '/conversations/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await assistantService.deleteConversation(req.user!.id, req.params.id);
    ok(res, { success: true });
  }),
);
assistantRoutes.post(
  '/ask',
  aiLimiter,
  validate({ body: askSchema }),
  asyncHandler(async (req, res) => {
    const result = await assistantService.ask(req.user!.id, req.body);
    await audit({ action: 'assistant.ask', entityType: 'AiConversation', entityId: result.conversationId, req, metadata: { question: req.body.question } });
    ok(res, result);
  }),
);
