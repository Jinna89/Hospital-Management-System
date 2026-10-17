import { beforeEach, describe, expect, it } from 'vitest';
import { getDaySlots } from '../src/lib/availability';
import { api, API } from './helpers/app';
import { prisma, resetDb } from './helpers/db';
import { addSchedule, bearer, createDoctor, createPatient, nextDateOn } from './helpers/factories';

describe('doctor schedules', () => {
  beforeEach(resetDb);

  it('creates a weekly schedule', async () => {
    const doctor = await createDoctor();

    const res = await api()
      .post(`${API}/doctors/me/schedules`)
      .set(bearer(doctor.token))
      .send({ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '13:00' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      dayOfWeek: 'MONDAY',
      consultationDurationMins: 20,
      isActive: true,
    });
  });

  it('rejects windows that end before they start, or that are shorter than one consultation', async () => {
    const doctor = await createDoctor();
    const post = (body: object) =>
      api().post(`${API}/doctors/me/schedules`).set(bearer(doctor.token)).send(body);

    const backwards = await post({ dayOfWeek: 'MONDAY', startTime: '13:00', endTime: '09:00' });
    const tooShort = await post({
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '09:10',
      consultationDurationMins: 20,
    });
    const badBreak = await post({
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '13:00',
      breakStartTime: '14:00',
      breakEndTime: '15:00',
    });
    const badFormat = await post({ dayOfWeek: 'MONDAY', startTime: '9am', endTime: '13:00' });

    expect([backwards.status, tooShort.status, badBreak.status, badFormat.status]).toEqual([
      422, 422, 422, 422,
    ]);
  });

  it('forbids overlapping windows on the same day but allows adjacent ones', async () => {
    const doctor = await createDoctor();
    await addSchedule(doctor.profile.id, 'TUESDAY', { startTime: '09:00', endTime: '13:00' });
    const post = (startTime: string, endTime: string) =>
      api()
        .post(`${API}/doctors/me/schedules`)
        .set(bearer(doctor.token))
        .send({ dayOfWeek: 'TUESDAY', startTime, endTime });

    expect((await post('12:00', '15:00')).status).toBe(409);
    expect((await post('13:00', '17:00')).status).toBe(201);
  });

  it('only lets doctors manage schedules, and only their own', async () => {
    const owner = await createDoctor();
    const other = await createDoctor();
    const patient = await createPatient();
    const schedule = await addSchedule(owner.profile.id, 'MONDAY');

    const asPatient = await api()
      .post(`${API}/doctors/me/schedules`)
      .set(bearer(patient.token))
      .send({ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' });
    const otherDoctor = await api()
      .patch(`${API}/doctors/me/schedules/${schedule.id}`)
      .set(bearer(other.token))
      .send({ isActive: false });
    const ownerUpdate = await api()
      .patch(`${API}/doctors/me/schedules/${schedule.id}`)
      .set(bearer(owner.token))
      .send({ consultationDurationMins: 30 });

    expect(asPatient.status).toBe(403);
    expect(otherDoctor.status).toBe(404);
    expect(ownerUpdate.status).toBe(200);
    expect(ownerUpdate.body.data.consultationDurationMins).toBe(30);
  });

  it('deletes a schedule and records the change in the audit log', async () => {
    const doctor = await createDoctor();
    const schedule = await addSchedule(doctor.profile.id, 'MONDAY');

    const res = await api()
      .delete(`${API}/doctors/me/schedules/${schedule.id}`)
      .set(bearer(doctor.token));

    expect(res.status).toBe(200);
    expect(await prisma.doctorSchedule.count()).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'SCHEDULE_DELETED' } })).toBe(1);
  });
});

describe('doctor leave', () => {
  beforeEach(resetDb);

  it('creates a leave and lists it back', async () => {
    const doctor = await createDoctor();
    const date = nextDateOn('MONDAY');

    const created = await api()
      .post(`${API}/doctors/me/leaves`)
      .set(bearer(doctor.token))
      .send({ startDate: date, endDate: date, reason: 'Conference' });
    const list = await api().get(`${API}/doctors/me/leaves`).set(bearer(doctor.token));

    expect(created.status).toBe(201);
    expect(list.body.data).toEqual([
      expect.objectContaining({ startDate: date, endDate: date, reason: 'Conference' }),
    ]);
  });

  it('rejects leave in the past, reversed ranges and overlapping leave', async () => {
    const doctor = await createDoctor();
    const date = nextDateOn('MONDAY');
    const post = (startDate: string, endDate: string) =>
      api().post(`${API}/doctors/me/leaves`).set(bearer(doctor.token)).send({ startDate, endDate });

    expect((await post('2020-01-01', '2020-01-02')).status).toBe(422);
    expect((await post(date, '2000-01-01')).status).toBe(422);
    expect((await post(date, date)).status).toBe(201);
    expect((await post(date, date)).status).toBe(409);
  });
});

describe('available slots', () => {
  beforeEach(resetDb);

  const slotsFor = (token: string, doctorId: string, date: string) =>
    api().get(`${API}/doctors/${doctorId}/available-slots?date=${date}`).set(bearer(token));

  it('splits the working window into consultation-sized slots', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    await addSchedule(doctor.profile.id, 'MONDAY', { startTime: '09:00', endTime: '10:00' });

    const res = await slotsFor(patient.token, doctor.profile.id, nextDateOn('MONDAY'));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { startTime: '09:00', endTime: '09:20', available: true },
      { startTime: '09:20', endTime: '09:40', available: true },
      { startTime: '09:40', endTime: '10:00', available: true },
    ]);
  });

  it('skips slots that touch a break', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    await addSchedule(doctor.profile.id, 'MONDAY', {
      startTime: '09:00',
      endTime: '10:00',
      breakStartTime: '09:20',
      breakEndTime: '09:40',
    });

    const res = await slotsFor(patient.token, doctor.profile.id, nextDateOn('MONDAY'));

    expect(res.body.data.map((s: { startTime: string }) => s.startTime)).toEqual([
      '09:00',
      '09:40',
    ]);
  });

  it('returns no slots on a non-working day or during leave', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    await addSchedule(doctor.profile.id, 'MONDAY');
    const monday = nextDateOn('MONDAY');
    await prisma.doctorLeave.create({
      data: {
        doctorId: doctor.profile.id,
        startDate: new Date(`${monday}T00:00:00Z`),
        endDate: new Date(`${monday}T00:00:00Z`),
      },
    });

    const onLeave = await slotsFor(patient.token, doctor.profile.id, monday);
    const offDay = await slotsFor(patient.token, doctor.profile.id, nextDateOn('TUESDAY'));

    expect(onLeave.body.data).toEqual([]);
    expect(offDay.body.data).toEqual([]);
  });

  it('marks already-booked slots unavailable', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    await addSchedule(doctor.profile.id, 'MONDAY', { startTime: '09:00', endTime: '09:40' });
    const monday = nextDateOn('MONDAY');
    await prisma.appointment.create({
      data: {
        patientId: patient.profile.id,
        doctorId: doctor.profile.id,
        appointmentDate: new Date(`${monday}T00:00:00Z`),
        startTime: '09:00',
        endTime: '09:20',
        consultationFee: 1000,
      },
    });

    const res = await slotsFor(patient.token, doctor.profile.id, monday);

    expect(res.body.data).toEqual([
      { startTime: '09:00', endTime: '09:20', available: false },
      { startTime: '09:20', endTime: '09:40', available: true },
    ]);
  });

  it('frees a slot whose unpaid booking has expired', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    await addSchedule(doctor.profile.id, 'MONDAY', { startTime: '09:00', endTime: '09:20' });
    const monday = nextDateOn('MONDAY');
    await prisma.appointment.create({
      data: {
        patientId: patient.profile.id,
        doctorId: doctor.profile.id,
        appointmentDate: new Date(`${monday}T00:00:00Z`),
        startTime: '09:00',
        endTime: '09:20',
        consultationFee: 1000,
        createdAt: new Date(Date.now() - 60 * 60_000), // an hour old, still unpaid
      },
    });

    const res = await slotsFor(patient.token, doctor.profile.id, monday);

    expect(res.body.data[0]).toMatchObject({ startTime: '09:00', available: true });
    const expired = await prisma.appointment.findFirstOrThrow();
    expect(expired).toMatchObject({ status: 'CANCELLED', holdsSlot: null });
  });

  it('never offers a slot that has already started', async () => {
    const doctor = await createDoctor();
    await addSchedule(doctor.profile.id, 'MONDAY', { startTime: '09:00', endTime: '10:00' });
    const monday = nextDateOn('MONDAY');
    // 09:30 hospital time (UTC+6) on that Monday == 03:30 UTC.
    const now = new Date(`${monday}T03:30:00Z`);

    const slots = await getDaySlots(prisma, doctor.profile.id, monday, now);

    expect(slots.map((s) => [s.startTime, s.available])).toEqual([
      ['09:00', false],
      ['09:20', false],
      ['09:40', true],
    ]);
  });

  it('does not expose slots of unverified doctors and validates the date', async () => {
    const patient = await createPatient();
    const pending = await createDoctor({ verified: false });
    const verified = await createDoctor();

    const unverified = await slotsFor(patient.token, pending.profile.id, nextDateOn('MONDAY'));
    const badDate = await slotsFor(patient.token, verified.profile.id, '2026-02-31');
    const missingDate = await api()
      .get(`${API}/doctors/${verified.profile.id}/available-slots`)
      .set(bearer(patient.token));

    expect(unverified.status).toBe(404);
    expect(badDate.status).toBe(400);
    expect(missingDate.status).toBe(422);
  });
});
