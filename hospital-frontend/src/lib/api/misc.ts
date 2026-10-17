import { apiClient } from "@/lib/api-client";
import type { ApiSuccess, AppNotification, Department } from "@/types/api";

export async function listDepartments() {
  const res = await apiClient.get<ApiSuccess<Department[]>>("/departments");
  return res.data;
}

export async function listNotifications() {
  const res = await apiClient.get<ApiSuccess<AppNotification[]>>("/notifications");
  return res.data;
}
