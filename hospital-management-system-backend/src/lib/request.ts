import type { Request } from 'express';
import type { UserRole } from '@prisma/client';
import { AppError } from '../utils/AppError';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface Actor {
  id: string;
  role: UserRole;
}

export function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

/** Returns the authenticated user or throws 401. Use inside `requireAuth()` routes. */
export function getActor(req: Request): Actor {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  return req.user;
}
