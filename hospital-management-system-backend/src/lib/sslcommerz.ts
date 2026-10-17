import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const SANDBOX_BASE_URL = 'https://sandbox.sslcommerz.com';
const LIVE_BASE_URL = 'https://securepay.sslcommerz.com';
const REQUEST_TIMEOUT_MS = 15_000;

export interface GatewaySessionInput {
  tranId: string;
  amount: number;
  currency: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  productName: string;
  customer: { name: string; email: string; phone?: string | null };
}

export interface GatewaySession {
  gatewayUrl: string;
  sessionKey?: string;
}

export interface GatewayValidation {
  /** `VALID` / `VALIDATED` mean the money was received; anything else is a failure. */
  status: string;
  tranId: string;
  amount: number;
  currency: string;
  valId: string;
  bankTranId?: string;
  raw: Record<string, unknown>;
}

const baseUrl = () => (env.SSLCOMMERZ_IS_LIVE ? LIVE_BASE_URL : SANDBOX_BASE_URL);

function credentials() {
  if (!env.SSLCOMMERZ_STORE_ID || !env.SSLCOMMERZ_STORE_PASSWORD) {
    throw new AppError('Payment gateway is not configured', 503);
  }
  return { storeId: env.SSLCOMMERZ_STORE_ID, storePassword: env.SSLCOMMERZ_STORE_PASSWORD };
}

async function requestJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new AppError('Payment gateway is unreachable, please try again', 502);
  }
  if (!response.ok) {
    throw new AppError(`Payment gateway responded with HTTP ${response.status}`, 502);
  }
  return (await response.json()) as Record<string, unknown>;
}

/**
 * Thin SSLCommerz client. It is exported as an object (not bare functions) so
 * tests can replace the two network calls without touching the real gateway.
 */
export const sslcommerz = {
  /** Opens a hosted checkout session and returns the URL to redirect the patient to. */
  async createSession(input: GatewaySessionInput): Promise<GatewaySession> {
    const { storeId, storePassword } = credentials();
    const form = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: input.amount.toFixed(2),
      currency: input.currency,
      tran_id: input.tranId,
      success_url: input.successUrl,
      fail_url: input.failUrl,
      cancel_url: input.cancelUrl,
      ipn_url: input.ipnUrl,
      cus_name: input.customer.name,
      cus_email: input.customer.email,
      cus_phone: input.customer.phone || '01700000000',
      cus_add1: 'N/A',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: input.productName,
      product_category: 'Healthcare',
      product_profile: 'general',
    });

    const body = await requestJson(`${baseUrl()}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });

    const gatewayUrl = body.GatewayPageURL;
    if (body.status !== 'SUCCESS' || typeof gatewayUrl !== 'string' || gatewayUrl === '') {
      const reason = typeof body.failedreason === 'string' ? body.failedreason : 'unknown reason';
      throw new AppError(`Payment gateway rejected the session: ${reason}`, 502);
    }
    return {
      gatewayUrl,
      sessionKey: typeof body.sessionkey === 'string' ? body.sessionkey : undefined,
    };
  },

  /**
   * Asks SSLCommerz directly whether `valId` is a real, successful payment.
   * Callback payloads are never trusted on their own — only this answer is.
   */
  async validate(valId: string): Promise<GatewayValidation> {
    const { storeId, storePassword } = credentials();
    const query = new URLSearchParams({
      val_id: valId,
      store_id: storeId,
      store_passwd: storePassword,
      format: 'json',
    });
    const body = await requestJson(`${baseUrl()}/validator/api/validationserverAPI.php?${query}`);

    return {
      status: String(body.status ?? ''),
      tranId: String(body.tran_id ?? ''),
      amount: Number(body.amount ?? Number.NaN),
      currency: String(body.currency ?? ''),
      valId: String(body.val_id ?? valId),
      bankTranId: typeof body.bank_tran_id === 'string' ? body.bank_tran_id : undefined,
      raw: body,
    };
  },
};
