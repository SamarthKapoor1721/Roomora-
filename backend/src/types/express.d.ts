import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      email: string;
      role: Role;
      fullName: string;
    }
    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
