import { apiClient } from "@/lib/api-client";
import type { ApiSuccess, AuthUser, LoginResponseData } from "@/types/api";

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function registerPatient(payload: RegisterPayload) {
  const res = await apiClient.post<ApiSuccess<LoginResponseData | AuthUser>>(
    "/auth/register",
    payload
  );
  return res.data;
}

export async function login(payload: LoginPayload) {
  const res = await apiClient.post<ApiSuccess<LoginResponseData>>("/auth/login", payload);
  return res.data;
}

export async function logout(refreshToken: string) {
  const res = await apiClient.post<ApiSuccess<null>>("/auth/logout", { refreshToken });
  return res.data;
}

export async function fetchMe() {
  const res = await apiClient.get<ApiSuccess<AuthUser>>("/auth/me");
  return res.data;
}
