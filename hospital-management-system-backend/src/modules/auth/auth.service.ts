import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import type { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { hashPassword, verifyPassword } from '../../utils/password';
import {
  getTokenExpiry,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { AppError } from '../../utils/AppError';
import { recordAudit } from '../../lib/audit';
import type { RequestMeta } from '../../lib/request';
import { toAuthUser } from '../../lib/user.mapper';
import type { LoginInput, RegisterInput } from './auth.validation';

/**
 * Refresh tokens are stored hashed (never plaintext) so a database leak
 * alone cannot be used to impersonate users — mirrors how passwords are handled.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokenPair(userId: string, role: UserRole, meta: RequestMeta) {
  const accessToken = signAccessToken({ sub: userId, role });

  const jti = uuid();
  const refreshToken = signRefreshToken({ sub: userId, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: getTokenExpiry(refreshToken),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput, meta: RequestMeta) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          phone: input.phone,
          role: 'PATIENT',
          patient: { create: {} },
        },
      });

      await recordAudit(tx, {
        actorId: created.id,
        action: 'PATIENT_REGISTERED',
        entityType: 'User',
        entityId: created.id,
        meta,
      });

      return created;
    });

    const tokens = await issueTokenPair(user.id, user.role, meta);
    return { user: toAuthUser(user), ...tokens };
  },

  async login(input: LoginInput, meta: RequestMeta) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.deletedAt) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const validPassword = await verifyPassword(user.passwordHash, input.password);
    if (!validPassword) {
      throw AppError.unauthorized('Invalid email or password');
    }
    // Checked after the password so account state is not revealed to someone
    // who does not know the credentials.
    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('This account has been suspended. Contact hospital administration.');
    }

    const tokens = await issueTokenPair(user.id, user.role, meta);
    return { user: toAuthUser(user), ...tokens };
  },

  async refresh(refreshToken: string, meta: RequestMeta) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (
      !stored ||
      stored.revokedAt ||
      stored.tokenHash !== hashToken(refreshToken) ||
      stored.expiresAt < new Date()
    ) {
      throw AppError.unauthorized('Refresh token is invalid, expired, or has been revoked');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw AppError.unauthorized('Account is no longer accessible');
    }

    // Rotate: revoke the used refresh token (only if nobody else already did,
    // so a replayed token cannot mint a second pair) and issue a new pair.
    const revoked = await prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) {
      throw AppError.unauthorized('Refresh token is invalid, expired, or has been revoked');
    }

    const tokens = await issueTokenPair(user.id, user.role, meta);
    return { user: toAuthUser(user), ...tokens };
  },

  async logout(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Logging out with an already-invalid token is not an error condition
      // from the client's perspective — the end state (logged out) is the
      // same either way.
    }
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw AppError.unauthorized('Account no longer exists');
    return toAuthUser(user);
  },
};
