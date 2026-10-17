import { beforeEach, describe, expect, it } from 'vitest';
import { api, API } from './helpers/app';
import { prisma, resetDb } from './helpers/db';
import {
  bearer,
  createAdmin,
  createAppointment,
  createConsultation,
  createDoctor,
  createPatient,
} from './helpers/factories';

describe('consultations', () => {
  beforeEach(resetDb);

  describe('starting', () => {
    it('starts for a checked-in patient and moves the appointment to in progress', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const { appointment } = await createAppointment(doctor, patient, { status: 'CHECKED_IN' });

      const res = await api()
        .post(`${API}/consultations`)
        .set(bearer(doctor.token))
        .send({ appointmentId: appointment.id, chiefComplaint: 'Chest pain' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        chiefComplaint: 'Chest pain',
        status: 'IN_PROGRESS',
        appointment: { status: 'IN_PROGRESS' },
      });
    });

    it('refuses an unpaid or not-yet-checked-in appointment, a repeat start and other doctors', async () => {
      const doctor = await createDoctor();
      const stranger = await createDoctor();
      const patient = await createPatient();
      const confirmed = await createAppointment(doctor, patient, { status: 'CONFIRMED' });
      const checkedIn = await createAppointment(doctor, patient, { status: 'CHECKED_IN' });
      const start = (token: string, appointmentId: string) =>
        api().post(`${API}/consultations`).set(bearer(token)).send({ appointmentId });

      expect((await start(doctor.token, confirmed.appointment.id)).status).toBe(409);
      expect((await start(stranger.token, checkedIn.appointment.id)).status).toBe(404);
      expect((await start(doctor.token, checkedIn.appointment.id)).status).toBe(201);
      expect((await start(doctor.token, checkedIn.appointment.id)).status).toBe(409);
      expect((await start(patient.token, checkedIn.appointment.id)).status).toBe(403);
    });
  });

  describe('recording and completing', () => {
    const patchAs = (token: string, id: string, body: object) =>
      api().patch(`${API}/consultations/${id}`).set(bearer(token)).send(body);

    it('saves clinical notes and audits what changed', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const consultation = await createConsultation(doctor, patient);

      const res = await patchAs(doctor.token, consultation.id, {
        symptoms: 'Headache, nausea',
        diagnosis: 'Migraine',
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ symptoms: 'Headache, nausea', diagnosis: 'Migraine' });
      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { action: 'CONSULTATION_UPDATED' },
      });
      expect(audit.newValue).toMatchObject({ diagnosis: 'Migraine' });
    });

    it('needs a diagnosis to complete, then locks the record and completes the appointment', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const consultation = await createConsultation(doctor, patient);

      const missing = await patchAs(doctor.token, consultation.id, { status: 'COMPLETED' });
      expect(missing.status).toBe(422);

      const done = await patchAs(doctor.token, consultation.id, {
        diagnosis: 'Migraine',
        status: 'COMPLETED',
      });
      expect(done.status).toBe(200);
      expect(done.body.data.appointment.status).toBe('COMPLETED');
      expect(
        await prisma.notification.count({
          where: { userId: patient.user.id, type: 'CONSULTATION_COMPLETED' },
        }),
      ).toBe(1);

      const locked = await patchAs(doctor.token, consultation.id, { diagnosis: 'Edited later' });
      expect(locked.status).toBe(409);
    });

    it('rejects a follow-up date in the past', async () => {
      const doctor = await createDoctor();
      const consultation = await createConsultation(doctor, await createPatient());

      const res = await patchAs(doctor.token, consultation.id, { followUpDate: '2020-01-01' });

      expect(res.status).toBe(422);
    });

    it('is editable only by the consulting doctor', async () => {
      const doctor = await createDoctor();
      const consultation = await createConsultation(doctor, await createPatient());
      const stranger = await createDoctor();
      const patient = await createPatient();

      expect((await patchAs(stranger.token, consultation.id, { symptoms: 'x' })).status).toBe(404);
      expect((await patchAs(patient.token, consultation.id, { symptoms: 'x' })).status).toBe(403);
    });
  });

  describe('visibility', () => {
    it('hides a draft from the patient until it is completed, but shows it to doctor and admin', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const admin = await createAdmin();
      const consultation = await createConsultation(doctor, patient);
      const get = (token: string) =>
        api().get(`${API}/consultations/${consultation.id}`).set(bearer(token));

      expect((await get(patient.token)).status).toBe(404);
      expect((await get(doctor.token)).status).toBe(200);
      expect((await get(admin.token)).status).toBe(200);

      await prisma.consultation.update({
        where: { id: consultation.id },
        data: { status: 'COMPLETED' },
      });
      expect((await get(patient.token)).status).toBe(200);
      expect((await get((await createPatient()).token)).status).toBe(404);
    });
  });
});

describe('prescriptions', () => {
  beforeEach(resetDb);

  const item = { dosage: '500mg', frequency: 'Twice daily', duration: '5 days' };
  const issue = (token: string, consultationId: string, items: object[], notes?: string) =>
    api().post(`${API}/prescriptions`).set(bearer(token)).send({ consultationId, items, notes });

  it('issues a prescription, adds new medicines to the catalog and notifies the patient', async () => {
    const doctor = await createDoctor();
    const patient = await createPatient();
    const consultation = await createConsultation(doctor, patient);

    const res = await issue(doctor.token, consultation.id, [
      { medicineName: 'Paracetamol', ...item },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(1);
    expect(await prisma.medicine.count({ where: { name: 'Paracetamol' } })).toBe(1);
    expect(
      await prisma.notification.count({
        where: { userId: patient.user.id, type: 'PRESCRIPTION_CREATED' },
      }),
    ).toBe(1);
  });

  it('reuses a catalog medicine regardless of letter case instead of duplicating it', async () => {
    const doctor = await createDoctor();
    const consultation = await createConsultation(doctor, await createPatient());
    const existing = await prisma.medicine.create({ data: { name: 'Amoxicillin' } });

    await issue(doctor.token, consultation.id, [{ medicineName: 'amoxicillin', ...item }]);
    await issue(doctor.token, consultation.id, [{ medicineId: existing.id, ...item }]);

    expect(await prisma.medicine.count()).toBe(1);
    expect(await prisma.prescriptionItem.count({ where: { medicineId: existing.id } })).toBe(2);
  });

  it('validates items: one medicine reference each, a known id and at least one item', async () => {
    const doctor = await createDoctor();
    const consultation = await createConsultation(doctor, await createPatient());

    const both = await issue(doctor.token, consultation.id, [
      { medicineName: 'A1', medicineId: crypto.randomUUID(), ...item },
    ]);
    const neither = await issue(doctor.token, consultation.id, [item]);
    const unknown = await issue(doctor.token, consultation.id, [
      { medicineId: crypto.randomUUID(), ...item },
    ]);
    const empty = await issue(doctor.token, consultation.id, []);

    expect([both.status, neither.status, unknown.status, empty.status]).toEqual([
      422, 422, 422, 422,
    ]);
  });

  it('refuses other doctors, patients and cancelled appointments', async () => {
    const doctor = await createDoctor();
    const patient = await createPatient();
    const consultation = await createConsultation(doctor, patient);
    const cancelled = await createConsultation(doctor, patient, {
      appointmentStatus: 'CANCELLED',
    });
    const items = [{ medicineName: 'Paracetamol', ...item }];

    expect((await issue((await createDoctor()).token, consultation.id, items)).status).toBe(404);
    expect((await issue(patient.token, consultation.id, items)).status).toBe(403);
    expect((await issue(doctor.token, cancelled.id, items)).status).toBe(409);
  });

  it('shows a prescription to its patient and doctor only', async () => {
    const doctor = await createDoctor();
    const patient = await createPatient();
    const consultation = await createConsultation(doctor, patient);
    const created = await issue(doctor.token, consultation.id, [
      { medicineName: 'Ibuprofen', ...item },
    ]);
    const id = created.body.data.id as string;
    const get = (token: string) => api().get(`${API}/prescriptions/${id}`).set(bearer(token));

    expect((await get(patient.token)).status).toBe(200);
    expect((await get(doctor.token)).status).toBe(200);
    expect((await get((await createPatient()).token)).status).toBe(404);
    expect((await get((await createDoctor()).token)).status).toBe(404);

    const mine = await api().get(`${API}/prescriptions`).set(bearer(patient.token));
    const theirs = await api()
      .get(`${API}/prescriptions`)
      .set(bearer((await createPatient()).token));
    expect(mine.body.meta.total).toBe(1);
    expect(theirs.body.meta.total).toBe(0);
  });
});

describe('medicine catalog', () => {
  beforeEach(resetDb);

  it('lets clinicians search it but not patients', async () => {
    const doctor = await createDoctor();
    const patient = await createPatient();
    await prisma.medicine.createMany({
      data: [{ name: 'Paracetamol', genericName: 'Acetaminophen' }, { name: 'Ibuprofen' }],
    });

    const byName = await api().get(`${API}/medicines?q=para`).set(bearer(doctor.token));
    const byGeneric = await api().get(`${API}/medicines?q=acetamin`).set(bearer(doctor.token));
    const asPatient = await api().get(`${API}/medicines`).set(bearer(patient.token));

    expect(byName.body.data.map((m: { name: string }) => m.name)).toEqual(['Paracetamol']);
    expect(byGeneric.body.meta.total).toBe(1);
    expect(asPatient.status).toBe(403);
  });
});
