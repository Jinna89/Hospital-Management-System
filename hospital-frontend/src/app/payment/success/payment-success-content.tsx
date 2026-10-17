"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { getAppointment } from "@/lib/api/appointments";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId") ?? searchParams.get("appointment_id");

  const { data, isLoading } = useQuery({
    queryKey: ["payment-success", "appointment", appointmentId],
    queryFn: () => getAppointment(appointmentId as string),
    enabled: Boolean(appointmentId),
  });

  const appointment = data?.data ?? null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-8" />
        </div>
        <CardTitle className="text-xl">Payment successful</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {!appointmentId ? (
          <p className="text-sm text-muted-foreground">
            Your payment was processed. You can review the appointment from your dashboard.
          </p>
        ) : isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : appointment ? (
          <div className="space-y-2 rounded-lg border border-border p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Doctor</span>
              <span className="font-medium text-foreground">
                {appointment.doctor?.name ? `Dr. ${appointment.doctor.name}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Date & time</span>
              <span className="font-medium text-foreground">
                {formatDateTime(appointment.appointmentDate)}
              </span>
            </div>
            {typeof appointment.doctor?.consultationFee === "number" ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount paid</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(appointment.doctor.consultationFee)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={appointment.status} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your payment was processed, but we couldn&apos;t load the appointment details here.
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          {appointmentId ? (
            <Button asChild>
              <Link href={`/patient/appointments/${appointmentId}`}>View appointment</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/patient/appointments">Go to my appointments</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/patient">Back to dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
