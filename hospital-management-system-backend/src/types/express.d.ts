import type { UserRole } from '@prisma/client';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by `requireAuth()`. */
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

export {};
