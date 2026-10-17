import { apiClient } from "@/lib/api-client";
import type {
  ApiSuccess,
  AuditLog,
  AuthUser,
  DashboardStats,
  Doctor,
  Role,
  RevenueReportPoint,
  UserStatus,
  VerificationStatus,
} from "@/types/api";

export async function listUsers(params: { page?: number; limit?: number; role?: Role }) {
  const res = await apiClient.get<ApiSuccess<AuthUser[]>>("/admin/users", { params });
  return res.data;
}

export async function updateUserStatus(id: string, status: UserStatus) {
  const res = await apiClient.patch<ApiSuccess<AuthUser>>(`/admin/users/${id}/status`, {
    status,
  });
  return res.data;
}

export async function verifyDoctor(id: string, verificationStatus: VerificationStatus) {
  const res = await apiClient.patch<ApiSuccess<Doctor>>(`/admin/doctors/${id}/verify`, {
    verificationStatus,
  });
  return res.data;
}

export async function getDashboardStats() {
  const res = await apiClient.get<ApiSuccess<DashboardStats>>("/admin/dashboard-stats");
  return res.data;
}

export async function getAuditLogs(params: { page?: number; limit?: number; entityType?: string }) {
  const res = await apiClient.get<ApiSuccess<AuditLog[]>>("/admin/audit-logs", { params });
  return res.data;
}

export async function getRevenueReport(params: { from?: string; to?: string }) {
  const res = await apiClient.get<ApiSuccess<RevenueReportPoint[]>>("/admin/revenue-report", {
    params,
  });
  return res.data;
}
