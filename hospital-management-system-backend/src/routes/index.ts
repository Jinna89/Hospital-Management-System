import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import doctorsRoutes from '../modules/doctors/doctors.routes';
import patientsRoutes from '../modules/patients/patients.routes';
import departmentsRoutes from '../modules/departments/departments.routes';
import schedulesRoutes from '../modules/schedules/schedules.routes';
import appointmentsRoutes from '../modules/appointments/appointments.routes';
import consultationsRoutes from '../modules/consultations/consultations.routes';
import prescriptionsRoutes from '../modules/prescriptions/prescriptions.routes';
import { labRequestRoutes, labTestRoutes } from '../modules/laboratory/laboratory.routes';
import paymentsRoutes from '../modules/payments/payments.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import adminRoutes from '../modules/admin/admin.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import auditLogsRoutes from '../modules/audit-logs/audit-logs.routes';
import medicinesRoutes from '../modules/medicines/medicines.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/doctors', schedulesRoutes);
router.use('/doctors', doctorsRoutes);
router.use('/patients', patientsRoutes);
router.use('/departments', departmentsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/consultations', consultationsRoutes);
router.use('/prescriptions', prescriptionsRoutes);
router.use('/lab-test-requests', labRequestRoutes);
router.use('/lab-tests', labTestRoutes);
router.use('/medicines', medicinesRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/admin/audit-logs', auditLogsRoutes);
router.use('/admin', adminRoutes);
router.use('/admin', analyticsRoutes);

export default router;
