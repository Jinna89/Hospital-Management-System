import { beforeEach, describe, expect, it } from 'vitest';
import { api, API } from './helpers/app';
import { prisma, resetDb } from './helpers/db';
import {
  bearer,
  createAdmin,
  createConsultation,
  createDoctor,
  createLabTest,
  createPatient,
} from './helpers/factories';

async function setup() {
  const doctor = await createDoctor();
  const patient = await createPatient();
  const consultation = await createConsultation(doctor, patient);
  const labTest = await createLabTest({ name: 'Complete Blood Count' });
  return { doctor, patient, consultation, labTest };
}

describe('laboratory', () => {
  beforeEach(resetDb);

  describe('catalog', () => {
    it('lets doctors search the lab test catalog but not patients', async () => {
      const { doctor, patient } = await setup();
      await createLabTest({ name: 'Lipid Profile' });

      const asDoctor = await api().get(`${API}/lab-tests?q=lipid`).set(bearer(doctor.token));
      expect(asDoctor.status).toBe(200);
      expect(asDoctor.body.data.map((t: { name: string }) => t.name)).toEqual(['Lipid Profile']);

      const asPatient = await api().get(`${API}/lab-tests`).set(bearer(patient.token));
      expect(asPatient.status).toBe(403);
    });
  });

  describe('requesting a test', () => {
    it('lets the consulting doctor request a test and notifies the patient', async () => {
      const { doctor, patient, consultation, labTest } = await setup();

      const res = await api()
        .post(`${API}/lab-test-requests`)
        .set(bearer(doctor.token))
        .send({ consultationId: consultation.id, labTestId: labTest.id, notes: 'Fasting' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        status: 'REQUESTED',
        notes: 'Fasting',
        labTest: { name: 'Complete Blood Count', price: 500 },
      });
      const notifications = await prisma.notification.findMany({
        where: { userId: patient.user.id },
      });
      expect(notifications).toHaveLength(1);
    });

    it("refuses another doctor's consultation", async () => {
      const { consultation, labTest } = await setup();
      const stranger = await createDoctor();

      const res = await api()
        .post(`${API}/lab-test-requests`)
        .set(bearer(stranger.token))
        .send({ consultationId: consultation.id, labTestId: labTest.id });

      expect(res.status).toBe(404);
    });

    it('refuses patients and unknown lab tests', async () => {
      const { doctor, patient, consultation, labTest } = await setup();

      const asPatient = await api()
        .post(`${API}/lab-test-requests`)
        .set(bearer(patient.token))
        .send({ consultationId: consultation.id, labTestId: labTest.id });
      expect(asPatient.status).toBe(403);

      const unknownTest = await api()
        .post(`${API}/lab-test-requests`)
        .set(bearer(doctor.token))
        .send({ consultationId: consultation.id, labTestId: crypto.randomUUID() });
      expect(unknownTest.status).toBe(422);
    });
  });

  describe('visibility', () => {
    it('shows each patient only their own requests, and admins everything', async () => {
      const { doctor, patient, consultation, labTest } = await setup();
      await api()
        .post(`${API}/lab-test-requests`)
        .set(bearer(doctor.token))
        .send({ consultationId: consultation.id, labTestId: labTest.id });
      const otherPatient = await createPatient();
      const admin = await createAdmin();

      const own = await api().get(`${API}/lab-test-requests`).set(bearer(patient.token));
      const other = await api().get(`${API}/lab-test-requests`).set(bearer(otherPatient.token));
      const all = await api().get(`${API}/lab-test-requests`).set(bearer(admin.token));

      expect(own.body.meta.total).toBe(1);
      expect(other.body.meta.total).toBe(0);
      expect(all.body.meta.total).toBe(1);
    });

    it('filters by status', async () => {
      const { doctor, patient, consultation, labTest } = await setup();
      await api()
        .post(`${API}/lab-test-requests`)
        .set(bearer(doctor.token))
        .send({ consultationId: consultation.id, labTestId: labTest.id });

      const none = await api()
        .get(`${API}/lab-test-requests?status=COMPLETED`)
        .set(bearer(patient.token));
      expect(none.body.data).toEqual([]);
    });
  });

  describe('recording results', () => {
    async function requested() {
      const ctx = await setup();
      const res = await api()
        .post(`${API}/lab-test-requests`)
        .set(bearer(ctx.doctor.token))
        .send({ consultationId: ctx.consultation.id, labTestId: ctx.labTest.id });
      return { ...ctx, requestId: res.body.data.id as string };
    }

    it('publishes a result, stores it and notifies the patient', async () => {
      const { doctor, patient, requestId } = await requested();

      const res = await api()
        .patch(`${API}/lab-test-requests/${requestId}/result`)
        .set(bearer(doctor.token))
        .send({ status: 'RESULT_AVAILABLE', resultSummary: 'All values normal' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        status: 'RESULT_AVAILABLE',
        resultSummary: 'All values normal',
      });
      const types = (
        await prisma.notification.findMany({ where: { userId: patient.user.id } })
      ).map((n) => n.type);
      expect(types).toContain('LAB_RESULT_AVAILABLE');
    });

    it('requires a summary or file to publish a result', async () => {
      const { doctor, requestId } = await requested();

      const res = await api()
        .patch(`${API}/lab-test-requests/${requestId}/result`)
        .set(bearer(doctor.token))
        .send({ status: 'RESULT_AVAILABLE' });

      expect(res.status).toBe(422);
    });

    it('never moves backwards or out of a final state', async () => {
      const { doctor, requestId } = await requested();
      const patch = (status: string, extra: object = {}) =>
        api()
          .patch(`${API}/lab-test-requests/${requestId}/result`)
          .set(bearer(doctor.token))
          .send({ status, ...extra });

      expect((await patch('IN_PROGRESS')).status).toBe(200);
      expect((await patch('SAMPLE_COLLECTED')).status).toBe(409);
      expect((await patch('RESULT_AVAILABLE', { resultSummary: 'Normal' })).status).toBe(200);
      expect((await patch('CANCELLED')).status).toBe(409);
    });

    it('does not let patients or other doctors change a request', async () => {
      const { patient, requestId } = await requested();
      const stranger = await createDoctor();
      const send = (token: string) =>
        api()
          .patch(`${API}/lab-test-requests/${requestId}/result`)
          .set(bearer(token))
          .send({ status: 'IN_PROGRESS' });

      expect((await send(patient.token)).status).toBe(403);
      expect((await send(stranger.token)).status).toBe(404);
    });
  });
});
