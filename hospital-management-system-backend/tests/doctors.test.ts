import { beforeEach, describe, expect, it } from 'vitest';
import { api, API } from './helpers/app';
import { prisma, resetDb } from './helpers/db';
import {
  addSchedule,
  bearer,
  createAdmin,
  createDepartment,
  createDoctor,
  createPatient,
  nextDateOn,
} from './helpers/factories';

describe('doctors', () => {
  beforeEach(resetDb);

  describe('listing & visibility', () => {
    it('shows patients only verified, active doctors', async () => {
      const patient = await createPatient();
      const visible = await createDoctor();
      await createDoctor({ verified: false });
      await createDoctor({ active: false });

      const res = await api().get(`${API}/doctors`).set(bearer(patient.token));

      expect(res.status).toBe(200);
      expect(res.body.data.map((d: { id: string }) => d.id)).toEqual([visible.profile.id]);
      expect(res.body.meta).toMatchObject({ page: 1, total: 1, totalPages: 1 });
    });

    it('lets admins see every doctor and filter by verification status', async () => {
      const admin = await createAdmin();
      await createDoctor();
      const pending = await createDoctor({ verified: false });

      const all = await api().get(`${API}/doctors`).set(bearer(admin.token));
      expect(all.body.meta.total).toBe(2);

      const filtered = await api()
        .get(`${API}/doctors?verificationStatus=PENDING`)
        .set(bearer(admin.token));
      expect(filtered.body.data.map((d: { id: string }) => d.id)).toEqual([pending.profile.id]);
    });

    it('requires authentication', async () => {
      const res = await api().get(`${API}/doctors`);
      expect(res.status).toBe(401);
    });

    it('hides the licence number from patients but not from admins', async () => {
      const patient = await createPatient();
      const admin = await createAdmin();
      const doctor = await createDoctor();

      const asPatient = await api()
        .get(`${API}/doctors/${doctor.profile.id}`)
        .set(bearer(patient.token));
      const asAdmin = await api()
        .get(`${API}/doctors/${doctor.profile.id}`)
        .set(bearer(admin.token));

      expect(asPatient.body.data).not.toHaveProperty('licenseNumber');
      expect(asAdmin.body.data.licenseNumber).toBe(doctor.profile.licenseNumber);
    });

    it('returns 404 for an unverified doctor to patients, but the owner can still read it', async () => {
      const patient = await createPatient();
      const doctor = await createDoctor({ verified: false });

      const asPatient = await api()
        .get(`${API}/doctors/${doctor.profile.id}`)
        .set(bearer(patient.token));
      const asOwner = await api()
        .get(`${API}/doctors/${doctor.profile.id}`)
        .set(bearer(doctor.token));

      expect(asPatient.status).toBe(404);
      expect(asOwner.status).toBe(200);
    });
  });

  describe('search & filtering', () => {
    it('searches by name, specialty and department', async () => {
      const patient = await createPatient();
      const cardiology = await createDepartment('Cardiology');
      const heart = await createDoctor({
        specialty: 'Heart Surgery',
        departmentIds: [cardiology.id],
      });
      await createDoctor({ specialty: 'Dermatology' });

      const bySpecialty = await api()
        .get(`${API}/doctors/search?q=heart`)
        .set(bearer(patient.token));
      const byDepartment = await api()
        .get(`${API}/doctors/search?q=cardio`)
        .set(bearer(patient.token));

      expect(bySpecialty.body.data.map((d: { id: string }) => d.id)).toEqual([heart.profile.id]);
      expect(byDepartment.body.data.map((d: { id: string }) => d.id)).toEqual([heart.profile.id]);
    });

    it('rejects a search term that is too short', async () => {
      const patient = await createPatient();
      const res = await api().get(`${API}/doctors/search?q=a`).set(bearer(patient.token));
      expect(res.status).toBe(422);
    });

    it('filters by fee range and experience, and sorts', async () => {
      const patient = await createPatient();
      await createDoctor({ consultationFee: 500, experienceYears: 2 });
      const mid = await createDoctor({ consultationFee: 1500, experienceYears: 10 });
      await createDoctor({ consultationFee: 3000, experienceYears: 20 });

      const filtered = await api()
        .get(`${API}/doctors?minFee=1000&maxFee=2000&minExperience=5`)
        .set(bearer(patient.token));
      expect(filtered.body.data.map((d: { id: string }) => d.id)).toEqual([mid.profile.id]);

      const sorted = await api()
        .get(`${API}/doctors?sortBy=experience&sortOrder=desc`)
        .set(bearer(patient.token));
      const years = sorted.body.data.map((d: { experienceYears: number }) => d.experienceYears);
      expect(years).toEqual([20, 10, 2]);
    });

    it('paginates', async () => {
      const patient = await createPatient();
      for (let i = 0; i < 3; i++) await createDoctor();

      const res = await api().get(`${API}/doctors?page=2&limit=2`).set(bearer(patient.token));

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });

    it('availableOn keeps doctors who work that weekday and are not on leave', async () => {
      const patient = await createPatient();
      const works = await createDoctor();
      const onLeave = await createDoctor();
      await createDoctor(); // no schedule at all
      await addSchedule(works.profile.id, 'MONDAY');
      await addSchedule(onLeave.profile.id, 'MONDAY');
      const monday = nextDateOn('MONDAY');
      await prisma.doctorLeave.create({
        data: {
          doctorId: onLeave.profile.id,
          startDate: new Date(`${monday}T00:00:00Z`),
          endDate: new Date(`${monday}T00:00:00Z`),
        },
      });

      const res = await api()
        .get(`${API}/doctors?availableOn=${monday}`)
        .set(bearer(patient.token));

      expect(res.body.data.map((d: { id: string }) => d.id)).toEqual([works.profile.id]);
    });
  });

  describe('own profile', () => {
    it('lets a doctor update their profile and departments', async () => {
      const doctor = await createDoctor();
      const department = await createDepartment('Neurology');

      const res = await api()
        .patch(`${API}/doctors/me`)
        .set(bearer(doctor.token))
        .send({ bio: 'Experienced.', departmentIds: [department.id] });

      expect(res.status).toBe(200);
      expect(res.body.data.bio).toBe('Experienced.');
      expect(res.body.data.departments).toEqual([{ id: department.id, name: 'Neurology' }]);
    });

    it('audits consultation fee changes', async () => {
      const doctor = await createDoctor({ consultationFee: 1000 });

      await api()
        .patch(`${API}/doctors/me`)
        .set(bearer(doctor.token))
        .send({ consultationFee: 1200 });

      const log = await prisma.auditLog.findFirst({ where: { action: 'DOCTOR_FEE_CHANGED' } });
      expect(log).toMatchObject({
        actorId: doctor.user.id,
        oldValue: { consultationFee: 1000 },
        newValue: { consultationFee: 1200 },
      });
    });

    it('forbids patients from the doctor-only profile endpoints', async () => {
      const patient = await createPatient();
      const res = await api()
        .patch(`${API}/doctors/me`)
        .set(bearer(patient.token))
        .send({ bio: 'nope' });
      expect(res.status).toBe(403);
    });

    it('rejects unknown departments and empty updates', async () => {
      const doctor = await createDoctor();

      const unknown = await api()
        .patch(`${API}/doctors/me`)
        .set(bearer(doctor.token))
        .send({ departmentIds: ['00000000-0000-4000-8000-000000000000'] });
      const empty = await api().patch(`${API}/doctors/me`).set(bearer(doctor.token)).send({});

      expect(unknown.status).toBe(422);
      expect(empty.status).toBe(422);
    });
  });
});
