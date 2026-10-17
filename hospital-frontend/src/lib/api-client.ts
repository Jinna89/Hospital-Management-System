import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/env";
import { useAuthStore } from "@/store/auth-store";
import type { ApiErrorShape } from "@/types/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// De-duped in-flight refresh promise so parallel 401s only trigger one refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ success: boolean; data: { accessToken: string; refreshToken?: string } }>(
        `${API_BASE_URL}/auth/refresh-token`,
        { refreshToken }
      )
      .then((res) => {
        const { accessToken, refreshToken: newRefresh } = res.data.data;
        const { user } = useAuthStore.getState();
        if (user) {
          useAuthStore.getState().setSession(user, accessToken, newRefresh ?? refreshToken);
        }
        return accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  // The API reports failures with non-2xx statuses, which axios already rejects.
  // This guards the rare 2xx body with `success: false` so callers can rely on
  // every resolved response being an `ApiSuccess`.
  (response) => {
    const body = response.data as Partial<ApiErrorShape> | undefined;
    if (body?.success === false) {
      return Promise.reject(new Error(body.message || "Request failed"));
    }
    return response;
  },
  async (error: AxiosError<ApiErrorShape>) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
