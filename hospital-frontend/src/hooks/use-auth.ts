"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { logout as apiLogout } from "@/lib/api/auth";
import { toast } from "sonner";
import type { Role } from "@/types/api";

export function roleHome(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "DOCTOR") return "/doctor";
  return "/patient";
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const router = useRouter();

  const isAuthenticated = Boolean(user && accessToken);

  const hasRole = useCallback(
    (...roles: Role[]) => Boolean(user && roles.includes(user.role)),
    [user]
  );

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await apiLogout(refreshToken);
      }
    } catch {
      // ignore network errors on logout, still clear local session
    } finally {
      clearSession();
      toast.success("Signed out");
      router.push("/login");
    }
  }, [refreshToken, clearSession, router]);

  return { user, accessToken, isAuthenticated, hasRole, logout };
}
