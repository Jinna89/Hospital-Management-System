import { apiClient } from "@/lib/api-client";
import type { ApiSuccess, Appointment, AppointmentStatus } from "@/types/api";

export interface CreateAppointmentPayload {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  reason?: string;
}

export async function createAppointment(payload: CreateAppointmentPayload) {
  const res = await apiClient.post<ApiSuccess<Appointment>>("/appointments", payload);
  return res.data;
}

export interface ListAppointmentsParams {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
}

export async function listAppointments(params: ListAppointmentsParams) {
  const res = await apiClient.get<ApiSuccess<Appointment[]>>("/appointments", { params });
  return res.data;
}

export async function getAppointment(id: string) {
  const res = await apiClient.get<ApiSuccess<Appointment>>(`/appointments/${id}`);
  return res.data;
}

export async function cancelAppointment(id: string, reason?: string) {
  const res = await apiClient.patch<ApiSuccess<Appointment>>(`/appointments/${id}/cancel`, {
    reason,
  });
  return res.data;
}

export async function rescheduleAppointment(
  id: string,
  payload: { appointmentDate: string; startTime: string }
) {
  const res = await apiClient.patch<ApiSuccess<Appointment>>(
    `/appointments/${id}/reschedule`,
    payload
  );
  return res.data;
}

export async function checkInAppointment(id: string) {
  const res = await apiClient.patch<ApiSuccess<Appointment>>(`/appointments/${id}/check-in`, {});
  return res.data;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const res = await apiClient.patch<ApiSuccess<Appointment>>(`/appointments/${id}/status`, {
    status,
  });
  return res.data;
}
