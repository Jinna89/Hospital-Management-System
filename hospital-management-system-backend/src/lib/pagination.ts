import { z } from 'zod';
import { buildPaginationMeta } from '../utils/apiResponse';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PageArgs {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function toPageArgs({ page, limit }: PaginationQuery): PageArgs {
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function toPageMeta({ page, limit }: PaginationQuery, total: number) {
  return buildPaginationMeta(page, limit, total);
}
