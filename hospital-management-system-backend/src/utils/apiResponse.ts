import type { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Every successful response in the system MUST use this shape:
 * { success: true, message, data, meta? }
 */
export function sendSuccess<T>(
  res: Response,
  {
    statusCode = 200,
    message = 'Operation successful',
    data,
    meta,
  }: { statusCode?: number; message?: string; data?: T; meta?: PaginationMeta },
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
    ...(meta ? { meta } : {}),
  });
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
