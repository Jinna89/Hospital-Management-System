import { apiClient } from "@/lib/api-client";
import type { ApiSuccess, Payment } from "@/types/api";

export async function initiatePayment(appointmentId: string) {
  const res = await apiClient.post<ApiSuccess<{ gatewayUrl: string; tranId: string }>>(
    "/payments/initiate",
    { appointmentId }
  );
  return res.data;
}

export async function getPayment(id: string) {
  const res = await apiClient.get<ApiSuccess<Payment>>(`/payments/${id}`);
  return res.data;
}
