import { login, registerPatient } from "@/lib/api/auth";
import type { LoginResponseData, Role } from "@/types/api";

/**
 * Fixed demo credentials for one-click role login, used for evaluation.
 *
 * Admin and Doctor are seeded directly in the backend's `prisma/seed.ts`
 * (see the backend README). The Patient demo account is not seeded, so
 * `loginAsDemo("PATIENT")` is self-healing: it tries to log in first, and
 * if that account doesn't exist yet it registers it on the fly (the
 * backend's /auth/register already returns a full token pair, so no
 * second request is needed) and reuses it on every later click.
 */
export const DEMO_ACCOUNTS: Record<Role, { email: string; password: string; label: string }> = {
  ADMIN: { email: "admin@hospital.test", password: "Admin@12345", label: "Admin" },
  DOCTOR: { email: "dr.rahman@hospital.test", password: "Doctor@12345", label: "Doctor" },
  PATIENT: {
    email: "demo.patient@medicare-hms.test",
    password: "DemoPatient@123",
    label: "Patient",
  },
};

export async function loginAsDemo(role: Role): Promise<LoginResponseData> {
  const creds = DEMO_ACCOUNTS[role];

  if (role === "PATIENT") {
    try {
      return (await login({ email: creds.email, password: creds.password })).data;
    } catch {
      // Falls through to registration below — the demo patient likely
      // doesn't exist on this backend yet.
    }

    const registerRes = await registerPatient({
      email: creds.email,
      password: creds.password,
      name: "Demo Patient",
      phone: "+8801700000099",
    });
    if ("accessToken" in registerRes.data) return registerRes.data;
    // Registration didn't return tokens, so sign in with the account it just created.
    return (await login({ email: creds.email, password: creds.password })).data;
  }

  return (await login({ email: creds.email, password: creds.password })).data;
}
