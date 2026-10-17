"use client";

import type { ReactNode } from "react";
import { CalendarClock, LayoutDashboard, LineChart, UserCircle } from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/doctor", label: "My Tasks", icon: LayoutDashboard },
  { href: "/doctor/schedule", label: "Schedule & Leave", icon: CalendarClock },
  { href: "/doctor/earnings", label: "Earnings & Analytics", icon: LineChart },
  { href: "/doctor/profile", label: "Profile & Availability", icon: UserCircle },
];

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Doctor">
      {children}
    </DashboardShell>
  );
}
