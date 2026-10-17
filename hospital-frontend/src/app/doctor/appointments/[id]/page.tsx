"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppointment, updateAppointmentStatus } from "@/lib/api/appointments";
import {
  createConsultation,
  createLabTestRequest,
  createPrescription,
  updateConsultation,
} from "@/lib/api/clinical";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDateTime, initials } from "@/lib/utils";
import { ClinicalStep } from "./_components/clinical-step";
import { ComplaintStep } from "./_components/complaint-step";
import { LabStep } from "./_components/lab-step";
import { PrescriptionStep } from "./_components/prescription-step";
import type { ClinicalValues, LabRequestValues, PrescriptionValues } from "./_components/schemas";
import { StepIndicator } from "./_components/step-indicator";
import { useConsultationId } from "./_components/use-consultation-id";

type Step = 0 | 1 | 2 | 3;

export default function ConsultationWorkflowPage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const router = useRouter();

  const { consultationId, remember } = useConsultationId(appointmentId);
  const [step, setStep] = useState<Step>(0);
  const [prescriptionSaved, setPrescriptionSaved] = useState(false);
  const [labRequested, setLabRequested] = useState(false);

  // A resumed consultation (id found in storage) can never be on step 0 again.
  const activeStep: Step = consultationId && step === 0 ? 1 : step;

  const { data, isLoading } = useQuery({
    queryKey: ["doctor", "appointment", appointmentId],
    queryFn: () => getAppointment(appointmentId),
  });
  const appointment = data?.data ?? null;

  const startConsultation = useMutation({
    mutationFn: (chiefComplaint: string) => createConsultation({ appointmentId, chiefComplaint }),
    onSuccess: (res) => {
      remember(res.data.id);
      toast.success("Consultation started");
      setStep(1);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const saveClinical = useMutation({
    mutationFn: (values: ClinicalValues) =>
      updateConsultation(consultationId as string, {
        symptoms: values.symptoms,
        diagnosis: values.diagnosis,
        clinicalNotes: values.clinicalNotes || undefined,
        treatmentPlan: values.treatmentPlan || undefined,
      }),
    onSuccess: () => {
      toast.success("Diagnosis & notes saved");
      setStep(2);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const savePrescription = useMutation({
    mutationFn: (values: PrescriptionValues) =>
      createPrescription({
        consultationId: consultationId as string,
        notes: values.notes || undefined,
        items: values.items.map((item) => ({
          ...item,
          instructions: item.instructions || undefined,
        })),
      }),
    onSuccess: () => {
      toast.success("Prescription saved");
      setPrescriptionSaved(true);
      setStep(3);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const requestLabTest = useMutation({
    mutationFn: (values: LabRequestValues) =>
      createLabTestRequest({
        consultationId: consultationId as string,
        labTestId: values.labTestId,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      toast.success("Lab test requested");
      setLabRequested(true);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const completeConsultation = useMutation({
    mutationFn: () => updateAppointmentStatus(appointmentId, "COMPLETED"),
    onSuccess: () => {
      toast.success("Consultation completed");
      router.push("/doctor");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  async function handleLabRequest(values: LabRequestValues): Promise<boolean> {
    try {
      await requestLabTest.mutateAsync(values);
      return true;
    } catch {
      return false; // already surfaced by the mutation's onError toast
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="Appointment not found"
        description="This appointment may have been removed or isn't assigned to you."
        action={
          <Button asChild size="sm">
            <Link href="/doctor">Back to my tasks</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback>{initials(appointment.patient?.name ?? "P")}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">
                {appointment.patient?.name ?? "Patient"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(appointment.appointmentDate)}
              </p>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </CardContent>
      </Card>

      <StepIndicator current={activeStep} />

      {activeStep === 0 && (
        <ComplaintStep
          isPending={startConsultation.isPending}
          onSubmit={({ chiefComplaint }) => startConsultation.mutate(chiefComplaint)}
        />
      )}
      {activeStep === 1 && (
        <ClinicalStep
          isPending={saveClinical.isPending}
          onSubmit={(values) => saveClinical.mutate(values)}
        />
      )}
      {activeStep === 2 && (
        <PrescriptionStep
          isPending={savePrescription.isPending}
          isSaved={prescriptionSaved}
          onSubmit={(values) => savePrescription.mutate(values)}
          onContinue={() => setStep(3)}
        />
      )}
      {activeStep === 3 && (
        <LabStep
          isRequesting={requestLabTest.isPending}
          isCompleting={completeConsultation.isPending}
          hasRequested={labRequested}
          onRequest={handleLabRequest}
          onComplete={() => completeConsultation.mutate()}
        />
      )}
    </div>
  );
}
