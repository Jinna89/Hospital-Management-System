"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { getPrescription } from "@/lib/api/clinical";
import { formatDate } from "@/lib/utils";

export default function PrescriptionDetailPage() {
  const params = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["patient", "prescription", params.id],
    queryFn: () => getPrescription(params.id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const prescription = data?.data ?? null;

  if (!prescription) {
    return (
      <EmptyState
        icon={FileText}
        title="Prescription not found"
        description="This prescription may have been removed or you don't have access to it."
        action={
          <Button asChild size="sm">
            <Link href="/patient/prescriptions">Back to prescriptions</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Prescription</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Issued {prescription.createdAt ? formatDate(prescription.createdAt) : "—"}
        </p>
      </div>

      {prescription.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doctor&apos;s notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            {prescription.notes}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {prescription.items && prescription.items.length > 0 ? (
            prescription.items.map((item, idx) => (
              <div
                key={`${item.medicineId}-${idx}`}
                className="flex items-start gap-3 rounded-lg border border-border p-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/50 text-primary">
                  <Pill className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{item.medicineId}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.dosage}
                    {item.frequency ? ` · ${item.frequency}` : ""}
                    {item.duration ? ` · ${item.duration}` : ""}
                  </p>
                  {item.instructions ? (
                    <p className="text-xs text-muted-foreground">{item.instructions}</p>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No medication items on this prescription.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
