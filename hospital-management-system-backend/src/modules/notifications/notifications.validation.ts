import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  isRead: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
