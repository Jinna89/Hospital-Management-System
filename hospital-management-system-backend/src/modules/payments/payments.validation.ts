import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';
import { DATE_PATTERN } from '../../lib/schedule';

export const initiatePaymentSchema = z.object({
  appointmentId: z.string().uuid(),
});

/**
 * SSLCommerz posts many more fields than we need (card brand, bank id, …).
 * Only the lookup keys are read here — the money itself is confirmed through
 * the gateway's validation API, never from this payload.
 */
export const gatewayCallbackSchema = z
  .object({
    tran_id: z.string().min(1),
    val_id: z.string().min(1).optional(),
    error: z.string().optional(),
    failedreason: z.string().optional(),
  })
  .passthrough();

export const listPaymentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED']).optional(),
  from: z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format').optional(),
  to: z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format').optional(),
});

export type GatewayCallbackInput = z.infer<typeof gatewayCallbackSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
