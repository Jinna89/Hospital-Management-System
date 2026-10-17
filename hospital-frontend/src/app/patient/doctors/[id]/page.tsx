"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Check, Clock, Loader2, Star, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { getDoctor, getAvailableSlots } from "@/lib/api/doctors";
import { createAppointment } from "@/lib/api/appointments";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn, formatCurrency, initials } from "@/lib/utils";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DoctorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: doctorRes, isLoading: loadingDoctor } = useQuery({
    queryKey: ["doctor", params.id],
    queryFn: () => getDoctor(params.id),
  });

  const { data: slotsRes, isLoading: loadingSlots } = useQuery({
    queryKey: ["doctor", params.id, "slots", date],
    queryFn: () => getAvailableSlots(params.id, date),
    enabled: Boolean(date),
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      createAppointment({
        doctorId: params.id,
        appointmentDate: date,
        startTime: selectedSlot!,
        reason: reason || undefined,
      }),
    onSuccess: (res) => {
      toast.success("Appointment requested! Complete payment to confirm it.");
      queryClient.invalidateQueries({ queryKey: ["patient", "appointments"] });
      router.push(`/patient/appointments/${res.data.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const doctor = doctorRes?.data ?? null;
  const slots = useMemo(() => slotsRes?.data ?? [], [slotsRes]);

  if (loadingDoctor) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="Doctor not found"
        description="This doctor profile may have been removed or is unavailable."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials(doctor.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-foreground">Dr. {doctor.name}</h1>
              <p className="text-sm text-muted-foreground">
                {doctor.specialty ?? "General Physician"}
              </p>
              <div className="mt-1 flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {doctor.rating?.toFixed(1) ?? "New"}
                </span>
                {doctor.verificationStatus === "VERIFIED" ? (
                  <Badge variant="success">Verified</Badge>
                ) : null}
              </div>
            </div>
          </div>
          {doctor.consultationFee != null ? (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Consultation fee</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(doctor.consultationFee)}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {doctor.bio ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">{doctor.bio}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Book an appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarDays className="h-4 w-4" /> 1. Choose a date
            </label>
            <Input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedSlot(null);
              }}
              className="max-w-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4" /> 2. Choose a time slot
            </label>
            {loadingSlots ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-20" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available slots on this date. Try another date.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot.startTime)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      selectedSlot === slot.startTime
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    )}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              3. Reason for visit <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Persistent headache for 3 days"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Button
            disabled={!selectedSlot || bookMutation.isPending}
            onClick={() => bookMutation.mutate()}
            className="w-full sm:w-auto"
          >
            {bookMutation.isPending ? <Loader2 className="animate-spin" /> : <Check />}
            Confirm booking
          </Button>
          <p className="text-xs text-muted-foreground">
            Your appointment is held as pending until payment is completed on the next step.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
