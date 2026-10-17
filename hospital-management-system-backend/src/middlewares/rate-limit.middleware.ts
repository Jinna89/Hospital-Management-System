import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * In-memory rate limiting (express-rate-limit's default MemoryStore).
 * Simple and dependency-free. The trade-off: limits are per-process, so if
 * this API is ever scaled to multiple instances behind a load balancer,
 * each instance tracks its own counts (a client could get roughly
 * N x the limit by hitting different instances). For a single-instance
 * deployment this is a non-issue. If you later scale horizontally and want
 * a shared limit, swap the store for a Redis- or Postgres-backed one.
 */
export function buildLimiter(
  windowMs: number,
  max: number,
  message: string,
  options: { skip?: () => boolean } = {},
) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message, errors: [] },
    skip: options.skip,
  });
}

/** Integration tests share one IP, so the strict per-endpoint limits would trip them. */
const skipInTests = () => env.NODE_ENV === 'test';

// General API-wide limiter
export const generalRateLimiter = buildLimiter(
  env.RATE_LIMIT_WINDOW_MS,
  env.RATE_LIMIT_MAX,
  'Too many requests, please try again later.',
);

// Stricter limiters for sensitive/abuse-prone endpoints
export const loginRateLimiter = buildLimiter(
  15 * 60 * 1000,
  10,
  'Too many login attempts. Please try again later.',
  { skip: skipInTests },
);
export const registerRateLimiter = buildLimiter(
  60 * 60 * 1000,
  5,
  'Too many registration attempts. Please try again later.',
  { skip: skipInTests },
);
export const paymentInitiateRateLimiter = buildLimiter(
  15 * 60 * 1000,
  20,
  'Too many payment attempts. Please try again later.',
  { skip: skipInTests },
);
export const appointmentCreateRateLimiter = buildLimiter(
  60 * 1000,
  10,
  'Too many booking attempts. Please slow down.',
  { skip: skipInTests },
);
