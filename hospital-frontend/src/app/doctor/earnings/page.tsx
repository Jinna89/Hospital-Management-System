"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { CalendarCheck, CreditCard, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listAppointments } from "@/lib/api/appointments";
import { getMyDoctorProfile } from "@/lib/api/doctors";
import { formatCurrency } from "@/lib/utils";

// See admin/page.tsx for why this is lazy-loaded instead of imported directly.
const EarningsBarChart = dynamic(() => import("@/components/charts/earnings-bar-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

export default function DoctorEarningsPage() {
  const { data: profileRes, isLoading: profileLoading } = useQuery({
    queryKey: ["doctor", "me", "profile"],
    queryFn: getMyDoctorProfile,
  });

  const { data: apptRes, isLoading: apptLoading } = useQuery({
    queryKey: ["doctor", "appointments", "earnings"],
    queryFn: () => listAppointments({ page: 1, limit: 100 }),
  });

  const fee = profileRes?.data.consultationFee ?? 0;
  const appointments = apptRes?.data ?? [];
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const uniquePatients = new Set(completed.map((a) => a.patientId ?? a.patient?.id)).size;

  const monthly = useMemo(() => {
    const buckets = new Map<string, { label: string; consultations: number; earnings: number }>();
    for (const appt of completed) {
      const date = new Date(appt.appointmentDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      const existing = buckets.get(key) ?? { label, consultations: 0, earnings: 0 };
      existing.consultations += 1;
      existing.earnings += fee;
      buckets.set(key, existing);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);
  }, [completed, fee]);

  const totalEarnings = completed.length * fee;
  const isLoading = profileLoading || apptLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earnings & analytics"
        description="Your consultation activity and estimated earnings, based on your completed appointments."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total earnings"
            value={formatCurrency(totalEarnings)}
            icon={CreditCard}
            accent="royal"
          />
          <StatCard
            label="Completed consultations"
            value={completed.length}
            icon={CalendarCheck}
            accent="periwinkle"
          />
          <StatCard label="Unique patients seen" value={uniquePatients} icon={Users} accent="sky" />
          <StatCard
            label="Consultation fee"
            value={formatCurrency(fee)}
            icon={TrendingUp}
            accent="navy"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultations by month</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : monthly.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No completed consultations yet — your activity will show up here.
            </p>
          ) : (
            <EarningsBarChart data={monthly} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
