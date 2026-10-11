import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { authController } from './auth.controller';
import {
  changePasswordSchema,
  googleSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  setPasswordSchema,
} from './auth.schema';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
authRoutes.post('/google', authLimiter, validate({ body: googleSchema }), authController.google);
authRoutes.post('/google/link', authenticate, validate({ body: googleSchema.pick({ credential: true }) }), authController.linkGoogle);
authRoutes.post('/refresh', authLimiter, validate({ body: refreshSchema }), authController.refresh);
authRoutes.post('/logout', validate({ body: refreshSchema }), authController.logout);
authRoutes.post('/logout-all', authenticate, authController.logoutAll);
authRoutes.get('/me', authenticate, authController.me);
authRoutes.post('/set-password', authenticate, authLimiter, validate({ body: setPasswordSchema }), authController.setPassword);
authRoutes.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);
