"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, Pill } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { listPrescriptions } from "@/lib/api/clinical";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate } from "@/lib/utils";

export default function PatientPrescriptionsPage() {
  const { page, setPage } = usePagination(10);

  const { data, isLoading } = useQuery({
    queryKey: ["patient", "prescriptions", page],
    queryFn: () => listPrescriptions({ page, limit: 10 }),
  });

  const prescriptions = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My prescriptions"
        description="Medications prescribed to you by your doctors."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No prescriptions yet"
          description="Prescriptions from your doctors will appear here after a consultation."
        />
      ) : (
        <>
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <Link key={prescription.id} href={`/patient/prescriptions/${prescription.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-4 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {prescription.items?.length ?? 0} medicine
                          {(prescription.items?.length ?? 0) === 1 ? "" : "s"} prescribed
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {prescription.createdAt ? formatDate(prescription.createdAt) : "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
