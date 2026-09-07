import { Router } from 'express';
import { aiClient } from '../../lib/aiClient';
import { asyncHandler, ok } from '../../lib/http';
import { authenticate } from '../../middleware/authenticate';

export const aiRoutes = Router();
aiRoutes.use(authenticate);

/** Reports whether the NVIDIA-backed AI service is reachable. */
aiRoutes.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const health = await aiClient.health();
    ok(res, {
      aiServiceReachable: health !== null,
      nvidiaConfigured: health?.nvidiaConfigured ?? false,
      // What clients will see if they call AI features right now:
      effectiveMode: health?.nvidiaConfigured ? 'NVIDIA_AI (with rule-based fallback)' : 'RULE_BASED_FALLBACK',
    });
  }),
);
