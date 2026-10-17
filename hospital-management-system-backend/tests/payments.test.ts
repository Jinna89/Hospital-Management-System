import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sslcommerz, type GatewayValidation } from '../src/lib/sslcommerz';
import { api, API } from './helpers/app';
import { prisma, resetDb } from './helpers/db';
import {
  bearer,
  createAdmin,
  createAppointment,
  createDoctor,
  createPatient,
} from './helpers/factories';

const GATEWAY_URL = 'https://sandbox.sslcommerz.com/EasyCheckOut/abc';

function validationFor(
  payment: { gatewayTranId: string },
  overrides: Partial<GatewayValidation> = {},
): GatewayValidation {
  return {
    status: 'VALID',
    tranId: payment.gatewayTranId,
    amount: 1000,
    currency: 'BDT',
    valId: 'VAL-1',
    raw: { status: 'VALID' },
    ...overrides,
  };
}

async function pendingBooking() {
  const doctor = await createDoctor();
  const patient = await createPatient();
  const { appointment, payment } = await createAppointment(doctor, patient, {
    status: 'PENDING_PAYMENT',
  });
  return { doctor, patient, appointment, payment };
}

describe('payments', () => {
  beforeEach(async () => {
    await resetDb();
    vi.spyOn(sslcommerz, 'createSession').mockResolvedValue({ gatewayUrl: GATEWAY_URL });
  });
  afterEach(() => vi.restoreAllMocks());

  describe('initiating', () => {
    it('opens a checkout for the snapshotted fee and records a fresh transaction id', async () => {
      const { patient, appointment, payment } = await pendingBooking();

      const res = await api()
        .post(`${API}/payments/initiate`)
        .set(bearer(patient.token))
        .send({ appointmentId: appointment.id });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        amount: 1000,
        currency: 'BDT',
        gatewayUrl: GATEWAY_URL,
      });
      const session = vi.mocked(sslcommerz.createSession).mock.calls[0][0];
      expect(session.amount).toBe(1000);
      expect(session.successUrl).toContain('/payments/success');
      const stored = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(stored.gatewayTranId).toBe(res.body.data.tranId);
      expect(stored.gatewayTranId).not.toBe(payment.gatewayTranId);
    });

    it('only lets the booking’s own patient pay', async () => {
      const { appointment } = await pendingBooking();
      const stranger = await createPatient();
      const admin = await createAdmin();
      const pay = (token: string) =>
        api()
          .post(`${API}/payments/initiate`)
          .set(bearer(token))
          .send({ appointmentId: appointment.id });

      // Another patient can't see the booking at all; an admin never pays, so the role guard rejects them.
      expect((await pay(stranger.token)).status).toBe(404);
      expect((await pay(admin.token)).status).toBe(403);
    });

    it('refuses appointments that are not awaiting payment', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const confirmed = await createAppointment(doctor, patient, { status: 'CONFIRMED' });
      const cancelled = await createAppointment(doctor, patient, { status: 'CANCELLED' });
      const pay = (appointmentId: string) =>
        api().post(`${API}/payments/initiate`).set(bearer(patient.token)).send({ appointmentId });

      expect((await pay(confirmed.appointment.id)).status).toBe(409);
      expect((await pay(cancelled.appointment.id)).status).toBe(409);
    });

    it('surfaces a gateway failure instead of pretending it worked', async () => {
      const { patient, appointment } = await pendingBooking();
      vi.mocked(sslcommerz.createSession).mockRejectedValue(
        Object.assign(new Error('Payment gateway is unreachable'), { statusCode: 502 }),
      );

      const res = await api()
        .post(`${API}/payments/initiate`)
        .set(bearer(patient.token))
        .send({ appointmentId: appointment.id });

      expect(res.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('confirming', () => {
    const success = (payment: { gatewayTranId: string }, valId = 'VAL-1') =>
      api().post(`${API}/payments/success`).send({ tran_id: payment.gatewayTranId, val_id: valId });

    it('marks the payment paid, confirms the appointment and notifies everyone', async () => {
      const { doctor, patient, appointment, payment } = await pendingBooking();
      vi.spyOn(sslcommerz, 'validate').mockResolvedValue(validationFor(payment));

      const res = await success(payment);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PAID');
      const row = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
      expect(row.status).toBe('CONFIRMED');
      const patientTypes = (
        await prisma.notification.findMany({ where: { userId: patient.user.id } })
      ).map((n) => n.type);
      expect(patientTypes).toEqual(
        expect.arrayContaining(['PAYMENT_SUCCESSFUL', 'APPOINTMENT_CONFIRMED']),
      );
      expect(await prisma.notification.count({ where: { userId: doctor.user.id } })).toBe(1);
    });

    it('is idempotent: a repeated callback confirms once and does not re-validate', async () => {
      const { patient, payment } = await pendingBooking();
      const validate = vi.spyOn(sslcommerz, 'validate').mockResolvedValue(validationFor(payment));

      await success(payment);
      const again = await success(payment);

      expect(again.status).toBe(200);
      expect(validate).toHaveBeenCalledTimes(1);
      expect(
        await prisma.notification.count({
          where: { userId: patient.user.id, type: 'PAYMENT_SUCCESSFUL' },
        }),
      ).toBe(1);
    });

    it.each([
      ['a different amount', { amount: 1 }],
      ['a different transaction', { tranId: 'someone-elses' }],
      ['a different currency', { currency: 'USD' }],
      ['a non-successful gateway status', { status: 'FAILED' }],
    ])('rejects a callback the gateway reports with %s', async (_label, mismatch) => {
      const { appointment, payment } = await pendingBooking();
      vi.spyOn(sslcommerz, 'validate').mockResolvedValue(validationFor(payment, mismatch));

      const res = await success(payment);

      expect(res.status).toBe(422);
      const stored = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(stored.status).toBe('FAILED');
      const row = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
      expect(row.status).toBe('PENDING_PAYMENT');
    });

    it('requires a validation id and a known transaction', async () => {
      const { payment } = await pendingBooking();

      const noValId = await api()
        .post(`${API}/payments/success`)
        .send({ tran_id: payment.gatewayTranId });
      const unknown = await api()
        .post(`${API}/payments/success`)
        .send({ tran_id: 'nope', val_id: 'x' });

      expect(noValId.status).toBe(422);
      expect(unknown.status).toBe(404);
    });

    it('confirms through the server-to-server IPN even if the browser never returns', async () => {
      const { appointment, payment } = await pendingBooking();
      vi.spyOn(sslcommerz, 'validate').mockResolvedValue(validationFor(payment));

      const res = await api()
        .post(`${API}/payments/ipn`)
        .send({ tran_id: payment.gatewayTranId, val_id: 'VAL-1' });

      expect(res.status).toBe(200);
      const row = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
      expect(row.status).toBe('CONFIRMED');
    });
  });

  describe('browser redirects', () => {
    const form = (path: string, fields: Record<string, string>) =>
      api().post(`${API}/payments/${path}`).type('form').send(fields);

    it('sends the patient to the frontend success page after a verified payment', async () => {
      const { appointment, payment } = await pendingBooking();
      vi.spyOn(sslcommerz, 'validate').mockResolvedValue(validationFor(payment));

      const res = await form('success', { tran_id: payment.gatewayTranId, val_id: 'VAL-1' });

      expect(res.status).toBe(303);
      expect(res.headers.location).toBe(
        `http://localhost:3000/payment/success?appointmentId=${appointment.id}`,
      );
    });

    it('sends the patient to the cancel page when verification fails, never raw JSON', async () => {
      const { payment } = await pendingBooking();
      vi.spyOn(sslcommerz, 'validate').mockResolvedValue(validationFor(payment, { amount: 1 }));

      const res = await form('success', { tran_id: payment.gatewayTranId, val_id: 'VAL-1' });

      expect(res.status).toBe(303);
      expect(res.headers.location).toContain('/payment/cancel');
    });

    it('survives a garbage callback by redirecting', async () => {
      const res = await form('success', { nothing: 'useful' });

      expect(res.status).toBe(303);
      expect(res.headers.location).toContain('/payment/cancel?reason=verification_failed');
    });

    it('records cancelled and failed checkouts but never downgrades a paid payment', async () => {
      const { payment } = await pendingBooking();
      const paid = await createAppointment(await createDoctor(), await createPatient());

      const cancelled = await form('cancel', { tran_id: payment.gatewayTranId });
      const failedOnPaid = await form('fail', { tran_id: paid.payment.gatewayTranId });

      expect(cancelled.headers.location).toContain('/payment/cancel');
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(
        'CANCELLED',
      );
      expect(failedOnPaid.status).toBe(303);
      expect(
        (await prisma.payment.findUniqueOrThrow({ where: { id: paid.payment.id } })).status,
      ).toBe('PAID');
    });
  });

  describe('late payments', () => {
    async function expiredBooking() {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const { appointment, payment } = await createAppointment(doctor, patient, {
        status: 'CANCELLED',
        paymentStatus: 'PENDING',
      });
      return { doctor, patient, appointment, payment };
    }

    it('revives a booking whose slot is still free', async () => {
      const { appointment, payment } = await expiredBooking();
      vi.spyOn(sslcommerz, 'validate').mockResolvedValue(validationFor(payment));

      const res = await api()
        .post(`${API}/payments/ipn`)
        .send({ tran_id: payment.gatewayTranId, val_id: 'VAL-1' });

      expect(res.body.data.status).toBe('PAID');
      const row = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
      expect(row).toMatchObject({ status: 'CONFIRMED', holdsSlot: true });
    });

    it('flags a refund when someone else already took the slot', async () => {
      const { doctor, appointment, payment } = await expiredBooking();
      await prisma.appointment.create({
        data: {
          patientId: (await createPatient()).profile.id,
          doctorId: doctor.profile.id,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          consultationFee: 1000,
          status: 'CONFIRMED',
        },
      });
      vi.spyOn(sslcommerz, 'validate').mockResolvedValue(validationFor(payment));

      await api()
        .post(`${API}/payments/ipn`)
        .send({ tran_id: payment.gatewayTranId, val_id: 'VAL-1' });

      const stored = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(stored.status).toBe('REFUNDED');
      expect(await prisma.auditLog.count({ where: { action: 'PAYMENT_REFUND_REQUIRED' } })).toBe(1);
    });
  });

  describe('reading', () => {
    it('shows a payment only to its patient and to admins', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const stranger = await createPatient();
      const admin = await createAdmin();
      const { payment } = await createAppointment(doctor, patient);
      const get = (token: string) => api().get(`${API}/payments/${payment.id}`).set(bearer(token));

      expect((await get(patient.token)).status).toBe(200);
      expect((await get(admin.token)).status).toBe(200);
      expect((await get(stranger.token)).status).toBe(404);
      expect((await get(doctor.token)).status).toBe(403);
    });

    it('lists the patient’s own payments filtered by status', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      await createAppointment(doctor, patient, { paymentStatus: 'PAID' });
      await createAppointment(doctor, patient, { status: 'PENDING_PAYMENT' });
      await createAppointment(doctor, await createPatient());

      const all = await api().get(`${API}/payments`).set(bearer(patient.token));
      const paid = await api().get(`${API}/payments?status=PAID`).set(bearer(patient.token));

      expect(all.body.meta.total).toBe(2);
      expect(paid.body.meta.total).toBe(1);
    });
  });
});
