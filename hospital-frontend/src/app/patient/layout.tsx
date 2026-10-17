"use client";

import type { ReactNode } from "react";
import { CalendarDays, CreditCard, LayoutDashboard, Stethoscope, UserCircle } from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/patient", label: "My Activity", icon: LayoutDashboard },
  { href: "/patient/doctors", label: "Find a Doctor", icon: Stethoscope },
  { href: "/patient/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/patient/payments", label: "Payments", icon: CreditCard },
  { href: "/patient/profile", label: "Profile & Settings", icon: UserCircle },
];

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Patient">
      {children}
    </DashboardShell>
  );
}
