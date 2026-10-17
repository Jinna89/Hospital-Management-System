import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { prisma } from '../config/database';

/**
 * Verifies `Authorization: Bearer <access_token>`, confirms the user still
 * exists and is not suspended/deactivated (a revoked account must not keep
 * working just because its access token hasn't expired yet), and attaches
 * `req.user`.
 */
export function requireAuth() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        throw AppError.unauthorized('Missing or malformed Authorization header');
      }

      const payload = verifyAccessToken(header.slice('Bearer '.length));

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true, deletedAt: true },
      });

      if (!user || user.deletedAt) {
        throw AppError.unauthorized('Account no longer exists');
      }
      if (user.status !== 'ACTIVE') {
        throw AppError.forbidden('Account is not active');
      }

      req.user = { id: user.id, role: user.role };
      next();
    } catch (err) {
      next(
        err instanceof AppError ? err : AppError.unauthorized('Invalid or expired access token'),
      );
    }
  };
}
