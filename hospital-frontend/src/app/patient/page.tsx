"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Stethoscope, Clock, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAppointments } from "@/lib/api/appointments";
import { useAuth } from "@/hooks/use-auth";
import { formatDateTime } from "@/lib/utils";

export default function PatientActivityPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["patient", "appointments", "activity"],
    queryFn: () => listAppointments({ page: 1, limit: 50 }),
  });

  const appointments = data?.data ?? [];
  const upcoming = appointments.filter((a) =>
    ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "PENDING_PAYMENT"].includes(a.status)
  );
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const nextAppointment = [...upcoming].sort(
    (a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
  )[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"} 👋`}
        description="Here's a look at your upcoming care and recent activity."
        actions={
          <Button asChild>
            <Link href="/patient/doctors">
              <Stethoscope /> Find a doctor
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Upcoming appointments"
          value={upcoming.length}
          icon={CalendarDays}
          accent="royal"
        />
        <StatCard
          label="Completed visits"
          value={completed.length}
          icon={Clock}
          accent="periwinkle"
        />
        <StatCard
          label="Next appointment"
          value={
            nextAppointment ? formatDateTime(nextAppointment.appointmentDate) : "None scheduled"
          }
          icon={FileText}
          accent="sky"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming appointments</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/patient/appointments">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming appointments"
              description="Book a consultation with one of our verified doctors to get started."
              action={
                <Button asChild size="sm">
                  <Link href="/patient/doctors">Browse doctors</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {upcoming.slice(0, 5).map((apt) => (
                <Link
                  key={apt.id}
                  href={`/patient/appointments/${apt.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {apt.doctor?.name ?? "Doctor"}
                      {apt.doctor?.specialty ? ` · ${apt.doctor.specialty}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(apt.appointmentDate)}
                    </p>
                  </div>
                  <StatusBadge status={apt.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
