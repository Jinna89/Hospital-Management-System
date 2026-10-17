// Shared API envelope + domain types matching the documented backend contract.

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorShape {
  success: false;
  message: string;
  errors: unknown[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorShape;

export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  status?: UserStatus;
  createdAt?: string;
}

export interface LoginResponseData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface Doctor {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  specialty?: string;
  department?: string;
  bio?: string;
  experienceYears?: number;
  consultationFee?: number;
  verificationStatus?: VerificationStatus;
  avatarUrl?: string | null;
  rating?: number;
  [key: string]: unknown;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export type AppointmentStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "RESCHEDULED";

export interface Appointment {
  id: string;
  doctorId: string;
  patientId?: string;
  doctor?: Doctor;
  patient?: AuthUser;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: AppointmentStatus;
  reason?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface Consultation {
  id: string;
  appointmentId: string;
  chiefComplaint?: string;
  symptoms?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  followUpDate?: string;
  status?: string;
  [key: string]: unknown;
}

export interface PrescriptionItem {
  medicineId: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  consultationId: string;
  notes?: string;
  items?: PrescriptionItem[];
  createdAt?: string;
  [key: string]: unknown;
}

export type LabTestStatus =
  "REQUESTED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "RESULT_AVAILABLE" | "CANCELLED";

export interface LabTestRequest {
  id: string;
  consultationId: string;
  labTestId: string;
  notes?: string;
  status: LabTestStatus;
  resultSummary?: string;
  resultFileUrl?: string;
  [key: string]: unknown;
}

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

export interface Payment {
  id: string;
  appointmentId: string;
  amount?: number;
  status: PaymentStatus;
  tranId?: string;
  gatewayUrl?: string;
  [key: string]: unknown;
}

export interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  todaysAppointments: number;
  monthlyRevenue: number;
  paymentSuccessRate: number;
  [key: string]: unknown;
}

export interface RevenueReportPoint {
  date?: string;
  period?: string;
  revenue?: number;
  amount?: number;
  [key: string]: unknown;
}

export interface AuditLog {
  id: string;
  entityType: string;
  action?: string;
  actorId?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

export interface AppNotification {
  id: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface DoctorSchedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  consultationDurationMins: number;
}

export interface DoctorLeave {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
}
