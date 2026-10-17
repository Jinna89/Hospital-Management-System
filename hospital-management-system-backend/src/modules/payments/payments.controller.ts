import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { logError } from '../../utils/logger';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';
import { AppError } from '../../utils/AppError';
import { paymentsService, type CallbackOutcome } from './payments.service';
import { gatewayCallbackSchema, listPaymentsQuerySchema } from './payments.validation';

type CallbackKind = 'success' | 'fail' | 'cancel';

const checkoutResultUrl = (kind: CallbackKind, appointmentId?: string, reason?: string) => {
  const page = kind === 'success' ? 'success' : 'cancel';
  const query = new URLSearchParams();
  if (appointmentId) query.set('appointmentId', appointmentId);
  if (reason) query.set('reason', reason);
  const suffix = query.toString();
  return `${env.FRONTEND_URL}/payment/${page}${suffix ? `?${suffix}` : ''}`;
};

/** SSLCommerz sends the patient's browser here as a form POST; API clients send JSON. */
const isBrowserRedirect = (req: Request) => Boolean(req.is('application/x-www-form-urlencoded'));

async function handleCallback(kind: CallbackKind, req: Request, res: Response) {
  const meta = requestMeta(req);
  const browser = isBrowserRedirect(req);

  try {
    const body = gatewayCallbackSchema.parse(req.body);
    let outcome: CallbackOutcome;
    if (kind === 'success') {
      outcome = await paymentsService.confirm(body.tran_id, body.val_id, meta);
    } else {
      const reason = body.failedreason ?? body.error;
      outcome = await paymentsService.markUnsuccessful(
        body.tran_id,
        kind === 'fail' ? 'FAILED' : 'CANCELLED',
        reason,
        meta,
      );
    }

    if (browser) {
      const failed = kind === 'success' && outcome.status !== 'PAID';
      res.redirect(
        303,
        checkoutResultUrl(
          failed ? 'fail' : kind,
          outcome.appointmentId,
          kind === 'fail' ? 'failed' : undefined,
        ),
      );
      return;
    }
    sendSuccess(res, { message: `Payment ${outcome.status.toLowerCase()}`, data: outcome });
  } catch (error) {
    if (!browser) throw error;
    // A patient staring at raw JSON after paying is the worst outcome; send them somewhere useful.
    if (!(error instanceof AppError)) logError('Payment callback failed', error);
    res.redirect(303, checkoutResultUrl('fail', undefined, 'verification_failed'));
  }
}

export const paymentsController = {
  async initiate(req: Request, res: Response) {
    const data = await paymentsService.initiate(
      getActor(req),
      req.body.appointmentId,
      requestMeta(req),
    );
    sendSuccess(res, { statusCode: 201, message: 'Payment initiated', data });
  },

  success: (req: Request, res: Response) => handleCallback('success', req, res),
  fail: (req: Request, res: Response) => handleCallback('fail', req, res),
  cancel: (req: Request, res: Response) => handleCallback('cancel', req, res),

  /** Server-to-server notification: confirms payments even if the patient closes the browser early. */
  async ipn(req: Request, res: Response) {
    const body = gatewayCallbackSchema.parse(req.body);
    const outcome = await paymentsService.confirm(body.tran_id, body.val_id, requestMeta(req));
    sendSuccess(res, { message: 'IPN processed', data: outcome });
  },

  async list(req: Request, res: Response) {
    const query = listPaymentsQuerySchema.parse(req.query);
    const { items, meta } = await paymentsService.list(getActor(req), query);
    sendSuccess(res, { message: 'Payments retrieved', data: items, meta });
  },

  async getById(req: Request, res: Response) {
    const data = await paymentsService.getById(getActor(req), req.params.id);
    sendSuccess(res, { message: 'Payment retrieved', data });
  },
};
