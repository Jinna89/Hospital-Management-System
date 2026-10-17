import { apiClient } from "@/lib/api-client";
import type { ApiSuccess, AuthUser } from "@/types/api";

export async function getMyProfile() {
  const res = await apiClient.get<ApiSuccess<AuthUser>>("/users/me");
  return res.data;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  const res = await apiClient.patch<ApiSuccess<AuthUser>>("/users/me", payload);
  return res.data;
}
