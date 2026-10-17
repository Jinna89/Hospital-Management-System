"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listLabTestRequests } from "@/lib/api/clinical";
import { useQueryState } from "@/hooks/use-query-state";
import type { LabTestStatus } from "@/types/api";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "REQUESTED", label: "Requested" },
  { value: "SAMPLE_COLLECTED", label: "Sample collected" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESULT_AVAILABLE", label: "Result available" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function PatientLabReportsPage() {
  const { params, setParams } = useQueryState();
  const status = params.status ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["patient", "lab-reports", status],
    queryFn: () => listLabTestRequests({ status: status ? (status as LabTestStatus) : undefined }),
  });

  const reports = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab reports"
        description="Lab tests requested by your doctors and their results."
      />

      <div className="max-w-xs">
        <Select
          value={status || "all"}
          onValueChange={(v) => setParams({ status: v === "all" ? undefined : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No lab reports found"
          description="Lab tests requested during your consultations will show up here."
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FlaskConical className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Lab test #{report.id.slice(0, 8)}</p>
                    {report.resultSummary ? (
                      <p className="text-sm text-muted-foreground">{report.resultSummary}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Awaiting results</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {report.resultFileUrl ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={report.resultFileUrl} target="_blank" rel="noreferrer">
                        <Download className="size-3.5" /> Download result
                      </a>
                    </Button>
                  ) : null}
                  <StatusBadge status={report.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
