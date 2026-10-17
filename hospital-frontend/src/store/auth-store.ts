"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/api";

export const ROLE_COOKIE = "hms_role";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  updateUser: (user: AuthUser) => void;
  clearSession: () => void;
}

function setRoleCookie(role: string | null) {
  if (typeof document === "undefined") return;
  if (role) {
    document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, accessToken, refreshToken) => {
        setRoleCookie(user.role);
        set({ user, accessToken, refreshToken });
      },
      updateUser: (user) => set({ user }),
      clearSession: () => {
        setRoleCookie(null);
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: "hms-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
