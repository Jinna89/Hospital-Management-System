"use client";

import type { ReactNode } from "react";
import { FileClock, LayoutDashboard, UserCircle, Users } from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Manage Users & Doctors", icon: Users },
  { href: "/admin/reports", label: "Reports & Audit Logs", icon: FileClock },
  { href: "/admin/profile", label: "Profile & Settings", icon: UserCircle },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell navItems={NAV_ITEMS} roleLabel="Admin">
      {children}
    </DashboardShell>
  );
}
