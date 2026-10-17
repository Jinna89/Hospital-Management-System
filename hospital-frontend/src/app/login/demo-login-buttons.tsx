"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, Stethoscope, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { roleHome } from "@/hooks/use-auth";
import { loginAsDemo, DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { getApiErrorMessage } from "@/lib/api-client";
import type { Role } from "@/types/api";

const DEMO_ROLES: { role: Role; label: string; icon: typeof ShieldCheck; description: string }[] = [
  { role: "ADMIN", label: "Admin", icon: ShieldCheck, description: "Full system control" },
  { role: "PATIENT", label: "Patient", icon: User, description: "Book & manage care" },
  { role: "DOCTOR", label: "Doctor", icon: Stethoscope, description: "Manage consultations" },
];

export function DemoLoginButtons() {
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleDemoLogin(role: Role) {
    setLoadingRole(role);
    try {
      const data = await loginAsDemo(role);
      setSession(data.user, data.accessToken, data.refreshToken);
      toast.success(`Signed in as demo ${DEMO_ACCOUNTS[role].label}`);
      const redirect = searchParams.get("redirect");
      router.push(redirect || roleHome(data.user.role));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {DEMO_ROLES.map(({ role, label, icon: Icon, description }) => (
        <Button
          key={role}
          type="button"
          variant="outline"
          disabled={loadingRole !== null}
          onClick={() => handleDemoLogin(role)}
          className="flex h-auto flex-col items-center gap-1.5 py-4"
        >
          {loadingRole === role ? (
            <Loader2 className="size-5 animate-spin text-primary" />
          ) : (
            <Icon className="size-5 text-primary" />
          )}
          <span className="font-semibold">{label}</span>
          <span className="text-[11px] font-normal text-muted-foreground">{description}</span>
        </Button>
      ))}
    </div>
  );
}
