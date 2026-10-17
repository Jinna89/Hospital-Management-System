"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAppointments } from "@/lib/api/appointments";
import { formatCurrency, formatDate } from "@/lib/utils";

// The backend exposes payment status per-appointment (GET /payments/:id is
// looked up by a specific payment, there's no list-all-payments endpoint),
// so payment history is derived from the patient's own appointments, which
// already carry billing-relevant status (PENDING_PAYMENT / CONFIRMED / etc).
const BILLABLE_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export default function PatientPaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient", "payments", "from-appointments"],
    queryFn: () => listAppointments({ page: 1, limit: 100 }),
  });

  const appointments = (data?.data ?? []).filter((a) => BILLABLE_STATUSES.includes(a.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & billing"
        description="Consultation fees and payment status for your visits."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No billing history yet"
          description="Once you book an appointment, its payment status will appear here."
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CreditCard className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {apt.doctor?.name ? `Dr. ${apt.doctor.name}` : "Consultation"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(apt.appointmentDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {typeof apt.doctor?.consultationFee === "number" ? (
                    <span className="font-semibold text-foreground">
                      {formatCurrency(apt.doctor.consultationFee)}
                    </span>
                  ) : null}
                  <StatusBadge status={apt.status} />
                  {apt.status === "PENDING_PAYMENT" ? (
                    <Button size="sm" asChild>
                      <Link href={`/patient/appointments/${apt.id}`}>Pay now</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/patient/appointments/${apt.id}`}>View</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
