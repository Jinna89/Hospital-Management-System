import type {
  AppointmentStatus,
  DayOfWeek,
  Doctor,
  Patient,
  PaymentStatus,
  User,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../src/config/database';
import { DAYS_OF_WEEK, formatDateOnly, hospitalToday, parseDateOnly } from '../../src/lib/schedule';
import { hashPassword } from '../../src/utils/password';
import { signAccessToken } from '../../src/utils/jwt';

export const TEST_PASSWORD = 'Passw0rd!';
const HOSPITAL_OFFSET_MINUTES = 360;

let passwordHashPromise: Promise<string> | undefined;
/** Argon2 is deliberately slow, so hash the shared test password once. */
function sharedPasswordHash(): Promise<string> {
  passwordHashPromise ??= hashPassword(TEST_PASSWORD);
  return passwordHashPromise;
}

let sequence = 0;
const next = () => ++sequence;

export interface TestAccount<T> {
  user: User;
  profile: T;
  token: string;
}

async function createUser(role: UserRole, overrides: Partial<User> = {}): Promise<User> {
  const n = next();
  return prisma.user.create({
    data: {
      email: `${role.toLowerCase()}${n}@test.local`,
      passwordHash: await sharedPasswordHash(),
      name: `${role} ${n}`,
      role,
      ...overrides,
    },
  });
}

export const tokenFor = (user: Pick<User, 'id' | 'role'>) =>
  signAccessToken({ sub: user.id, role: user.role });

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createAdmin(): Promise<TestAccount<null>> {
  const user = await createUser('ADMIN');
  return { user, profile: null, token: tokenFor(user) };
}

export async function createPatient(
  userOverrides: Partial<User> = {},
): Promise<TestAccount<Patient>> {
  const user = await createUser('PATIENT', userOverrides);
  const profile = await prisma.patient.create({ data: { userId: user.id } });
  return { user, profile, token: tokenFor(user) };
}

export interface DoctorOptions {
  verified?: boolean;
  active?: boolean;
  specialty?: string;
  consultationFee?: number;
  experienceYears?: number;
  departmentIds?: string[];
}

export async function createDoctor(options: DoctorOptions = {}): Promise<TestAccount<Doctor>> {
  const n = next();
  const user = await createUser('DOCTOR');
  const profile = await prisma.doctor.create({
    data: {
      userId: user.id,
      name: `Dr. Test ${n}`,
      specialty: options.specialty ?? 'Cardiology',
      licenseNumber: `LIC-${n}-${Date.now()}`,
      consultationFee: options.consultationFee ?? 1000,
      experienceYears: options.experienceYears ?? 5,
      verificationStatus: options.verified === false ? 'PENDING' : 'VERIFIED',
      status: options.active === false ? 'INACTIVE' : 'ACTIVE',
      departments: options.departmentIds
        ? { create: options.departmentIds.map((departmentId) => ({ departmentId })) }
        : undefined,
    },
  });
  return { user, profile, token: tokenFor(user) };
}

export async function addSchedule(
  doctorId: string,
  dayOfWeek: DayOfWeek,
  overrides: Partial<{
    startTime: string;
    endTime: string;
    consultationDurationMins: number;
    breakStartTime: string;
    breakEndTime: string;
  }> = {},
) {
  return prisma.doctorSchedule.create({
    data: {
      doctorId,
      dayOfWeek,
      startTime: '09:00',
      endTime: '13:00',
      consultationDurationMins: 20,
      ...overrides,
    },
  });
}

/** The next calendar date (hospital time) that falls on `day`, at least `minDaysAhead` days out. */
export function nextDateOn(day: DayOfWeek, minDaysAhead = 2): string {
  const today = parseDateOnly(hospitalToday(new Date(), HOSPITAL_OFFSET_MINUTES));
  const cursor = new Date(today.getTime() + minDaysAhead * 86_400_000);
  while (DAYS_OF_WEEK[cursor.getUTCDay()] !== day) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return formatDateOnly(cursor);
}

export async function createDepartment(name?: string) {
  return prisma.department.create({ data: { name: name ?? `Department ${next()}` } });
}

export async function createLabTest(overrides: { name?: string; price?: number } = {}) {
  const n = next();
  return prisma.labTest.create({
    data: {
      name: overrides.name ?? `Lab Test ${n}`,
      code: `LT-${n}`,
      price: overrides.price ?? 500,
    },
  });
}

let slotCounter = 0;

export interface AppointmentOptions {
  /** Hospital-local `YYYY-MM-DD`; defaults to the next Monday, at least two days out. */
  date?: string;
  startTime?: string;
  status?: AppointmentStatus;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;
  paidAt?: Date;
  createdAt?: Date;
}

/**
 * An appointment with its payment row, created directly in the database so
 * tests can start from any state (confirmed, paid, expired…) without going
 * through the booking and payment flows.
 */
export async function createAppointment(
  doctor: TestAccount<Doctor>,
  patient: TestAccount<Patient>,
  options: AppointmentOptions = {},
) {
  // A distinct hour per call keeps several fixtures for one doctor from colliding on a slot.
  const hour = String(8 + (slotCounter++ % 12)).padStart(2, '0');
  const startTime = options.startTime ?? `${hour}:00`;
  const [h, m] = startTime.split(':').map(Number);
  const endTime = `${String(h).padStart(2, '0')}:${String(m + 20).padStart(2, '0')}`;
  const status = options.status ?? 'CONFIRMED';

  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.profile.id,
      doctorId: doctor.profile.id,
      appointmentDate: parseDateOnly(options.date ?? nextDateOn('MONDAY')),
      startTime,
      endTime,
      status,
      holdsSlot: status === 'CANCELLED' ? null : true,
      consultationFee: 1000,
      createdAt: options.createdAt,
    },
  });
  const payment = await createPayment(appointment.id, patient.profile.id, {
    status: options.paymentStatus ?? (status === 'PENDING_PAYMENT' ? 'PENDING' : 'PAID'),
    amount: options.paymentAmount,
    paidAt: options.paidAt,
  });
  return { appointment, payment };
}

/** An appointment with a consultation in progress, wired between the given doctor and patient. */
export async function createConsultation(
  doctor: TestAccount<Doctor>,
  patient: TestAccount<Patient>,
  options: Pick<AppointmentOptions, 'paymentStatus' | 'paymentAmount' | 'paidAt'> & {
    appointmentStatus?: AppointmentStatus;
  } = {},
) {
  const { appointmentStatus, ...paymentOptions } = options;
  const { appointment } = await createAppointment(doctor, patient, {
    status: appointmentStatus ?? 'IN_PROGRESS',
    ...paymentOptions,
  });
  return prisma.consultation.create({
    data: {
      appointmentId: appointment.id,
      doctorId: doctor.profile.id,
      patientId: patient.profile.id,
      chiefComplaint: 'Persistent headache',
    },
  });
}

export async function createPayment(
  appointmentId: string,
  patientId: string,
  overrides: { status?: PaymentStatus; amount?: number; paidAt?: Date } = {},
) {
  const n = next();
  const status = overrides.status ?? 'PAID';
  return prisma.payment.create({
    data: {
      appointmentId,
      patientId,
      amount: overrides.amount ?? 1000,
      status,
      gatewayTranId: `TRAN-${n}-${Date.now()}`,
      paidAt: status === 'PAID' ? (overrides.paidAt ?? new Date()) : null,
    },
  });
}
