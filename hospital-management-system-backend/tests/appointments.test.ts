import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hospitalToday, slotStartsAt } from '../src/lib/schedule';
import { api, API } from './helpers/app';
import { prisma, resetDb } from './helpers/db';
import {
  addSchedule,
  bearer,
  createAdmin,
  createAppointment,
  createDoctor,
  createPatient,
  nextDateOn,
  tokenFor,
} from './helpers/factories';

const HOSPITAL_OFFSET = 360;

async function doctorWithMondaySlots() {
  const doctor = await createDoctor({ consultationFee: 1200 });
  await addSchedule(doctor.profile.id, 'MONDAY');
  return doctor;
}

const book = (token: string, doctorId: string, appointmentDate: string, startTime = '09:00') =>
  api()
    .post(`${API}/appointments`)
    .set(bearer(token))
    .send({ doctorId, appointmentDate, startTime });

describe('appointments', () => {
  beforeEach(resetDb);
  afterEach(() => vi.useRealTimers());

  describe('booking', () => {
    it('reserves the slot, snapshots the fee server-side and notifies the patient', async () => {
      const patient = await createPatient();
      const doctor = await doctorWithMondaySlots();
      const date = nextDateOn('MONDAY');

      const res = await api()
        .post(`${API}/appointments`)
        .set(bearer(patient.token))
        // A client-supplied fee must be ignored.
        .send({ doctorId: doctor.profile.id, appointmentDate: date, startTime: '09:20', fee: 1 });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        status: 'PENDING_PAYMENT',
        appointmentDate: date,
        startTime: '09:20',
        endTime: '09:40',
        consultationFee: 1200,
        payment: { status: 'PENDING', amount: 1200 },
      });
      const notification = await prisma.notification.findFirstOrThrow({
        where: { userId: patient.user.id },
      });
      expect(notification.type).toBe('APPOINTMENT_BOOKED');
    });

    it('refuses a slot that is already booked', async () => {
      const doctor = await doctorWithMondaySlots();
      const date = nextDateOn('MONDAY');
      const first = await createPatient();
      const second = await createPatient();

      expect((await book(first.token, doctor.profile.id, date)).status).toBe(201);
      const clash = await book(second.token, doctor.profile.id, date);

      expect(clash.status).toBe(409);
    });

    it('lets the slot be booked again once its holder cancels', async () => {
      const doctor = await doctorWithMondaySlots();
      const date = nextDateOn('MONDAY');
      const first = await createPatient();
      const second = await createPatient();
      const booked = await book(first.token, doctor.profile.id, date);

      await api()
        .patch(`${API}/appointments/${booked.body.data.id}/cancel`)
        .set(bearer(first.token))
        .send({});

      expect((await book(second.token, doctor.profile.id, date)).status).toBe(201);
    });

    it('stops a patient double-booking themselves at the same time', async () => {
      const patient = await createPatient();
      const a = await doctorWithMondaySlots();
      const b = await doctorWithMondaySlots();
      const date = nextDateOn('MONDAY');

      expect((await book(patient.token, a.profile.id, date)).status).toBe(201);
      expect((await book(patient.token, b.profile.id, date)).status).toBe(409);
    });

    it.each([
      ['an unverified doctor', async () => createDoctor({ verified: false }), 404],
      ['an inactive doctor', async () => createDoctor({ active: false }), 404],
    ])('refuses %s', async (_label, makeDoctor, expected) => {
      const patient = await createPatient();
      const doctor = await makeDoctor();
      await addSchedule(doctor.profile.id, 'MONDAY');

      const res = await book(patient.token, doctor.profile.id, nextDateOn('MONDAY'));

      expect(res.status).toBe(expected);
    });

    it('refuses times the doctor does not offer, past dates and the far future', async () => {
      const patient = await createPatient();
      const doctor = await doctorWithMondaySlots();
      const date = nextDateOn('MONDAY');
      const farFuture = nextDateOn('MONDAY', 120);
      const yesterday = hospitalToday(new Date(Date.now() - 86_400_000), HOSPITAL_OFFSET);

      expect((await book(patient.token, doctor.profile.id, date, '09:05')).status).toBe(422);
      expect((await book(patient.token, doctor.profile.id, date, '18:00')).status).toBe(422);
      expect((await book(patient.token, doctor.profile.id, yesterday)).status).toBe(422);
      expect((await book(patient.token, doctor.profile.id, farFuture)).status).toBe(422);
    });

    it('is for patients only', async () => {
      const doctor = await doctorWithMondaySlots();
      const admin = await createAdmin();

      const res = await book(doctor.token, doctor.profile.id, nextDateOn('MONDAY'));
      const asAdmin = await book(admin.token, doctor.profile.id, nextDateOn('MONDAY'));

      expect(res.status).toBe(403);
      expect(asAdmin.status).toBe(403);
    });
  });

  describe('visibility', () => {
    it('shows an appointment only to its patient, its doctor and admins', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const stranger = await createPatient();
      const otherDoctor = await createDoctor();
      const admin = await createAdmin();
      const { appointment } = await createAppointment(doctor, patient);
      const get = (token: string) =>
        api().get(`${API}/appointments/${appointment.id}`).set(bearer(token));

      expect((await get(patient.token)).status).toBe(200);
      expect((await get(doctor.token)).status).toBe(200);
      expect((await get(admin.token)).status).toBe(200);
      expect((await get(stranger.token)).status).toBe(404);
      expect((await get(otherDoctor.token)).status).toBe(404);
    });

    it('lists only the caller’s appointments and filters by status', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const other = await createPatient();
      await createAppointment(doctor, patient, { status: 'CONFIRMED' });
      await createAppointment(doctor, patient, { status: 'COMPLETED' });
      await createAppointment(doctor, other);

      const all = await api().get(`${API}/appointments`).set(bearer(patient.token));
      const completed = await api()
        .get(`${API}/appointments?status=COMPLETED`)
        .set(bearer(patient.token));

      expect(all.body.meta.total).toBe(2);
      expect(completed.body.data).toHaveLength(1);
    });

    it('releases unpaid bookings after the payment window so the slot frees up', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      await createAppointment(doctor, patient, {
        status: 'PENDING_PAYMENT',
        createdAt: new Date(Date.now() - 30 * 60_000),
      });

      const res = await api().get(`${API}/appointments`).set(bearer(patient.token));

      expect(res.body.data[0]).toMatchObject({
        status: 'CANCELLED',
        cancelReason: 'Payment was not completed in time',
      });
    });
  });

  describe('cancelling', () => {
    const cancel = (token: string, id: string) =>
      api().patch(`${API}/appointments/${id}/cancel`).set(bearer(token)).send({ reason: 'Change' });

    it('refunds a patient who cancels at least 24 hours ahead', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const { appointment, payment } = await createAppointment(doctor, patient);

      const res = await cancel(patient.token, appointment.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ status: 'CANCELLED', refunded: true });
      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row.status).toBe('REFUNDED');
      const doctorNotice = await prisma.notification.findFirst({
        where: { userId: doctor.user.id },
      });
      expect(doctorNotice?.type).toBe('APPOINTMENT_CANCELLED');
    });

    it('keeps the fee when a patient cancels inside 24 hours', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const { appointment, payment } = await createAppointment(doctor, patient, {
        date: hospitalToday(new Date(), HOSPITAL_OFFSET),
        startTime: '23:40',
      });

      const res = await cancel(patient.token, appointment.id);

      expect(res.body.data.refunded).toBe(false);
      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row.status).toBe('PAID');
    });

    it('always refunds in full when the doctor cancels', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const { appointment } = await createAppointment(doctor, patient, {
        date: hospitalToday(new Date(), HOSPITAL_OFFSET),
        startTime: '23:40',
      });

      const res = await cancel(doctor.token, appointment.id);

      expect(res.body.data.refunded).toBe(true);
    });

    it('cancels an unpaid booking’s payment instead of refunding it', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const { appointment, payment } = await createAppointment(doctor, patient, {
        status: 'PENDING_PAYMENT',
      });

      await cancel(patient.token, appointment.id);

      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row.status).toBe('CANCELLED');
    });

    it('refuses to cancel a completed appointment or someone else’s', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const stranger = await createPatient();
      const done = await createAppointment(doctor, patient, { status: 'COMPLETED' });
      const open = await createAppointment(doctor, patient);

      expect((await cancel(patient.token, done.appointment.id)).status).toBe(409);
      expect((await cancel(stranger.token, open.appointment.id)).status).toBe(404);
    });
  });

  describe('rescheduling', () => {
    const reschedule = (token: string, id: string, appointmentDate: string, startTime: string) =>
      api()
        .patch(`${API}/appointments/${id}/reschedule`)
        .set(bearer(token))
        .send({ appointmentDate, startTime });

    it('moves a confirmed appointment and carries the payment with it', async () => {
      const doctor = await doctorWithMondaySlots();
      const patient = await createPatient();
      const date = nextDateOn('MONDAY');
      const { appointment, payment } = await createAppointment(doctor, patient, {
        date,
        startTime: '09:00',
      });

      const res = await reschedule(patient.token, appointment.id, date, '10:00');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ status: 'CONFIRMED', startTime: '10:00' });
      const old = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
      expect(old).toMatchObject({ status: 'RESCHEDULED', holdsSlot: null });
      const movedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(movedPayment.appointmentId).toBe(res.body.data.id);
    });

    it('refuses an unpaid booking, the same slot, a taken slot and doctors', async () => {
      const doctor = await doctorWithMondaySlots();
      const patient = await createPatient();
      const other = await createPatient();
      const date = nextDateOn('MONDAY');
      const confirmed = await createAppointment(doctor, patient, { date, startTime: '09:00' });
      await createAppointment(doctor, other, { date, startTime: '09:20' });
      const unpaid = await createAppointment(doctor, patient, {
        date,
        startTime: '09:40',
        status: 'PENDING_PAYMENT',
      });

      expect((await reschedule(patient.token, unpaid.appointment.id, date, '10:00')).status).toBe(
        409,
      );
      expect(
        (await reschedule(patient.token, confirmed.appointment.id, date, '09:00')).status,
      ).toBe(422);
      expect(
        (await reschedule(patient.token, confirmed.appointment.id, date, '09:20')).status,
      ).toBe(409);
      expect((await reschedule(doctor.token, confirmed.appointment.id, date, '10:00')).status).toBe(
        403,
      );
    });

    it('refuses to reschedule less than 12 hours before the start', async () => {
      const doctor = await doctorWithMondaySlots();
      const patient = await createPatient();
      const date = nextDateOn('MONDAY');
      const { appointment } = await createAppointment(doctor, patient, {
        date,
        startTime: '09:00',
      });
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(
        new Date(slotStartsAt(date, '09:00', HOSPITAL_OFFSET).getTime() - 3_600_000),
      );

      // The clock jumped days ahead, so a token minted earlier would already be expired.
      const res = await reschedule(tokenFor(patient.user), appointment.id, date, '10:00');

      expect(res.status).toBe(422);
    });
  });

  describe('checking in', () => {
    const checkIn = (token: string, id: string) =>
      api().patch(`${API}/appointments/${id}/check-in`).set(bearer(token));

    it('needs a paid appointment', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const { appointment } = await createAppointment(doctor, patient, {
        status: 'PENDING_PAYMENT',
      });

      expect((await checkIn(patient.token, appointment.id)).status).toBe(409);
    });

    it('opens an hour before the slot, not days ahead', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const date = nextDateOn('MONDAY');
      const { appointment } = await createAppointment(doctor, patient, {
        date,
        startTime: '09:00',
      });
      const slotStart = slotStartsAt(date, '09:00', HOSPITAL_OFFSET).getTime();

      const tooEarly = await checkIn(patient.token, appointment.id);
      expect(tooEarly.status).toBe(422);

      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(slotStart - 30 * 60_000));
      const ok = await checkIn(tokenFor(patient.user), appointment.id);
      expect(ok.status).toBe(200);
      expect(ok.body.data.status).toBe('CHECKED_IN');
    });

    it('lets the front desk check a patient in at any time and tells the doctor', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const admin = await createAdmin();
      const { appointment } = await createAppointment(doctor, patient);

      const res = await checkIn(admin.token, appointment.id);

      expect(res.body.data.status).toBe('CHECKED_IN');
      expect(await prisma.notification.count({ where: { userId: doctor.user.id } })).toBe(1);
    });
  });

  describe('clinical status', () => {
    it('stops patients changing it and only allows no-show once the slot started', async () => {
      const doctor = await createDoctor();
      const patient = await createPatient();
      const { appointment } = await createAppointment(doctor, patient);
      const setStatus = (token: string, status: string) =>
        api()
          .patch(`${API}/appointments/${appointment.id}/status`)
          .set(bearer(token))
          .send({ status });

      expect((await setStatus(patient.token, 'NO_SHOW')).status).toBe(403);
      expect((await setStatus(doctor.token, 'NO_SHOW')).status).toBe(422);
      expect((await setStatus(doctor.token, 'CONFIRMED')).status).toBe(422);
    });
  });
});
