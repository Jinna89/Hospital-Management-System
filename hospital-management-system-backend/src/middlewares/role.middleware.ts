import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * Must run after requireAuth(). Rejects any request whose user's role is
 * not in the allowed list — e.g. requireRole('DOCTOR') blocks patients and
 * admins alike from a doctor-only route, and requireRole('ADMIN') is used
 * on every admin management endpoint so a doctor can never reach it even if
 * they know the URL.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(
        AppError.forbidden(
          `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        ),
      );
      return;
    }
    next();
  };
}
