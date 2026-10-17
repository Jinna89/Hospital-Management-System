"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getAppointment, cancelAppointment } from "@/lib/api/appointments";
import { initiatePayment } from "@/lib/api/payments";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDate, formatCurrency, initials } from "@/lib/utils";

const CANCELLABLE: string[] = ["PENDING_PAYMENT", "CONFIRMED"];

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["patient", "appointment", params.id],
    queryFn: () => getAppointment(params.id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelAppointment(params.id, "Cancelled by patient"),
    onSuccess: () => {
      toast.success("Appointment cancelled");
      queryClient.invalidateQueries({ queryKey: ["patient", "appointment", params.id] });
      queryClient.invalidateQueries({ queryKey: ["patient", "appointments"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const payMutation = useMutation({
    mutationFn: () => initiatePayment(params.id),
    onSuccess: (res) => {
      window.location.href = res.data.gatewayUrl;
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const appointment = data?.data ?? null;

  if (!appointment) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Appointment not found"
        description="This appointment may have been removed or you don't have access to it."
        action={
          <Button asChild size="sm">
            <Link href="/patient/appointments">Back to appointments</Link>
          </Button>
        }
      />
    );
  }

  const canCancel = CANCELLABLE.includes(appointment.status);
  const canPay = appointment.status === "PENDING_PAYMENT";
  const fee =
    typeof appointment.doctor?.consultationFee === "number"
      ? appointment.doctor.consultationFee
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Appointment details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Booked on {appointment.createdAt ? formatDate(appointment.createdAt) : "—"}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback>{initials(appointment.doctor?.name ?? "Dr")}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">
                {appointment.doctor?.name ? `Dr. ${appointment.doctor.name}` : "Doctor"}
              </p>
              <p className="text-sm text-muted-foreground">
                {appointment.doctor?.specialty ?? "General Physician"}
              </p>
            </div>
          </div>
          {fee != null ? (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Consultation fee</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(fee)}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {formatDate(appointment.appointmentDate)}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {appointment.startTime}
            {appointment.endTime ? ` – ${appointment.endTime}` : ""}
          </div>
          {appointment.reason ? (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Reason for visit
              </p>
              <p className="mt-1 text-sm text-foreground">{appointment.reason}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {canPay ? (
          <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending}>
            {payMutation.isPending ? <Loader2 className="animate-spin" /> : <CreditCard />}
            Pay consultation fee
          </Button>
        ) : null}

        {appointment.status === "COMPLETED" ? (
          <Button variant="outline" asChild>
            <Link href="/patient/prescriptions">
              <FileText /> View prescriptions
            </Link>
          </Button>
        ) : null}

        {canCancel ? (
          <ConfirmDialog
            trigger={
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <XCircle /> Cancel appointment
              </Button>
            }
            title="Cancel this appointment?"
            description="This will free up the time slot. This action cannot be undone."
            confirmLabel="Yes, cancel it"
            destructive
            onConfirm={async () => {
              await cancelMutation.mutateAsync();
            }}
          />
        ) : null}

        <Button variant="ghost" onClick={() => router.push("/patient/doctors")}>
          <Stethoscope /> Book another doctor
        </Button>
      </div>
    </div>
  );
}
