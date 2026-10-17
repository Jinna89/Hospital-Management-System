import { beforeEach, describe, expect, it } from 'vitest';
import { api, API } from './helpers/app';
import { prisma, resetDb } from './helpers/db';
import {
  bearer,
  createAdmin,
  createConsultation,
  createDoctor,
  createPatient,
} from './helpers/factories';

describe('admin', () => {
  beforeEach(resetDb);

  describe('access control', () => {
    it.each([
      '/admin/users',
      '/admin/dashboard-stats',
      '/admin/revenue-report',
      '/admin/audit-logs',
    ])('keeps %s admin-only', async (path) => {
      const patient = await createPatient();
      const doctor = await createDoctor();

      expect((await api().get(`${API}${path}`)).status).toBe(401);
      expect((await api().get(`${API}${path}`).set(bearer(patient.token))).status).toBe(403);
      expect((await api().get(`${API}${path}`).set(bearer(doctor.token))).status).toBe(403);
    });
  });

  describe('user management', () => {
    it('lists users with filters and exposes each doctor’s profile id', async () => {
      const admin = await createAdmin();
      await createPatient();
      const doctor = await createDoctor({ verified: false });

      const res = await api().get(`${API}/admin/users?role=DOCTOR`).set(bearer(admin.token));

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0]).toMatchObject({
        id: doctor.user.id,
        doctor: { id: doctor.profile.id, verificationStatus: 'PENDING' },
      });
      expect(res.body.data[0]).not.toHaveProperty('passwordHash');
    });

    it('searches by name or email', async () => {
      const admin = await createAdmin();
      const target = await createPatient({ name: 'Zaynab Rahman' });
      await createPatient();

      const res = await api().get(`${API}/admin/users?q=zaynab`).set(bearer(admin.token));

      expect(res.body.data.map((u: { id: string }) => u.id)).toEqual([target.user.id]);
    });

    it('suspends a user: blocks their token, revokes sessions and writes an audit entry', async () => {
      const admin = await createAdmin();
      const patient = await createPatient();
      await prisma.refreshToken.create({
        data: {
          userId: patient.user.id,
          tokenHash: 'hash-1',
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });

      const res = await api()
        .patch(`${API}/admin/users/${patient.user.id}/status`)
        .set(bearer(admin.token))
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SUSPENDED');

      const afterwards = await api().get(`${API}/users/me`).set(bearer(patient.token));
      expect(afterwards.status).toBe(403);

      const token = await prisma.refreshToken.findFirstOrThrow({
        where: { userId: patient.user.id },
      });
      expect(token.revokedAt).not.toBeNull();

      const audit = await prisma.auditLog.findFirst({ where: { action: 'USER_STATUS_CHANGED' } });
      expect(audit).toMatchObject({
        actorId: admin.user.id,
        entityId: patient.user.id,
        newValue: { status: 'SUSPENDED' },
      });
    });

    it('can reactivate a suspended user', async () => {
      const admin = await createAdmin();
      const patient = await createPatient({ status: 'SUSPENDED' });

      const res = await api()
        .patch(`${API}/admin/users/${patient.user.id}/status`)
        .set(bearer(admin.token))
        .send({ status: 'ACTIVE' });

      expect(res.body.data.status).toBe('ACTIVE');
      expect((await api().get(`${API}/users/me`).set(bearer(patient.token))).status).toBe(200);
    });

    it('refuses to change the admin’s own status and rejects invalid values', async () => {
      const admin = await createAdmin();

      const self = await api()
        .patch(`${API}/admin/users/${admin.user.id}/status`)
        .set(bearer(admin.token))
        .send({ status: 'SUSPENDED' });
      expect(self.status).toBe(403);

      const other = await createPatient();
      const invalid = await api()
        .patch(`${API}/admin/users/${other.user.id}/status`)
        .set(bearer(admin.token))
        .send({ status: 'BANNED' });
      expect(invalid.status).toBe(422);
    });
  });

  describe('doctor verification', () => {
    it('verifies a doctor, making them bookable, and notifies them', async () => {
      const admin = await createAdmin();
      const patient = await createPatient();
      const doctor = await createDoctor({ verified: false });

      const before = await api()
        .get(`${API}/doctors/${doctor.profile.id}`)
        .set(bearer(patient.token));
      expect(before.status).toBe(404);

      const res = await api()
        .patch(`${API}/admin/doctors/${doctor.profile.id}/verify`)
        .set(bearer(admin.token))
        .send({ verificationStatus: 'VERIFIED' });
      expect(res.status).toBe(200);
      expect(res.body.data.verificationStatus).toBe('VERIFIED');

      const after = await api()
        .get(`${API}/doctors/${doctor.profile.id}`)
        .set(bearer(patient.token));
      expect(after.status).toBe(200);

      expect(await prisma.notification.count({ where: { userId: doctor.user.id } })).toBe(1);
      expect(await prisma.auditLog.count({ where: { action: 'DOCTOR_VERIFIED' } })).toBe(1);
    });

    it('returns 404 for an unknown doctor', async () => {
      const admin = await createAdmin();

      const res = await api()
        .patch(`${API}/admin/doctors/${crypto.randomUUID()}/verify`)
        .set(bearer(admin.token))
        .send({ verificationStatus: 'VERIFIED' });

      expect(res.status).toBe(404);
    });
  });

  describe('analytics', () => {
    it('summarises the platform', async () => {
      const admin = await createAdmin();
      const patient = await createPatient();
      const doctor = await createDoctor();
      await createConsultation(doctor, patient, { paymentStatus: 'PAID', paymentAmount: 1500 });
      await createConsultation(doctor, patient, { paymentStatus: 'FAILED' });

      const res = await api().get(`${API}/admin/dashboard-stats`).set(bearer(admin.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        totalPatients: 1,
        totalDoctors: 1,
        totalAppointments: 2,
        monthlyRevenue: 1500,
        paymentSuccessRate: 0.5,
      });
    });

    it('reports zero rates on an empty platform instead of dividing by zero', async () => {
      const admin = await createAdmin();

      const res = await api().get(`${API}/admin/dashboard-stats`).set(bearer(admin.token));

      expect(res.body.data).toMatchObject({ monthlyRevenue: 0, paymentSuccessRate: 0 });
    });

    it('groups paid revenue by day within the requested range', async () => {
      const admin = await createAdmin();
      const patient = await createPatient();
      const doctor = await createDoctor();
      const pay = async (paidAt: Date, amount: number) => {
        await createConsultation(doctor, patient, { paymentAmount: amount, paidAt });
      };
      await pay(new Date('2026-03-10T08:00:00Z'), 1000);
      await pay(new Date('2026-03-10T09:30:00Z'), 500);
      await pay(new Date('2026-03-12T08:00:00Z'), 700);
      await pay(new Date('2026-01-01T08:00:00Z'), 9999);

      const res = await api()
        .get(`${API}/admin/revenue-report?from=2026-03-01&to=2026-03-31`)
        .set(bearer(admin.token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { date: '2026-03-10', revenue: 1500, payments: 2 },
        { date: '2026-03-12', revenue: 700, payments: 1 },
      ]);
    });

    it('rejects inverted and oversized ranges', async () => {
      const admin = await createAdmin();
      const get = (qs: string) =>
        api().get(`${API}/admin/revenue-report?${qs}`).set(bearer(admin.token));

      expect((await get('from=2026-03-10&to=2026-03-01')).status).toBe(422);
      expect((await get('from=2020-01-01&to=2026-03-01')).status).toBe(422);
    });
  });

  describe('audit logs', () => {
    it('lists entries newest first and filters by entity type', async () => {
      const admin = await createAdmin();
      await prisma.auditLog.createMany({
        data: [
          { actorId: admin.user.id, action: 'A', entityType: 'Doctor', entityId: '1' },
          { actorId: admin.user.id, action: 'B', entityType: 'Payment', entityId: '2' },
        ],
      });

      const all = await api().get(`${API}/admin/audit-logs`).set(bearer(admin.token));
      expect(all.body.meta.total).toBe(2);
      expect(all.body.data[0].actor).toMatchObject({ id: admin.user.id });

      const filtered = await api()
        .get(`${API}/admin/audit-logs?entityType=Payment`)
        .set(bearer(admin.token));
      expect(filtered.body.data.map((l: { action: string }) => l.action)).toEqual(['B']);
    });
  });
});
