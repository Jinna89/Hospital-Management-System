"use client";

import { useQuery } from "@tanstack/react-query";
import { FileClock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuditLogs } from "@/lib/api/admin";
import { usePagination } from "@/hooks/use-pagination";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types/api";

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All entities" },
  { value: "Appointment", label: "Appointments" },
  { value: "Payment", label: "Payments" },
  { value: "User", label: "Users" },
  { value: "Doctor", label: "Doctors" },
];

export default function AdminReportsPage() {
  const { page, status: entityType, setPage, setStatus: setEntityType } = usePagination(15);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", { page, entityType }],
    queryFn: () => getAuditLogs({ page, limit: 15, entityType: entityType || undefined }),
  });

  const logs = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const columns: DataTableColumn<AuditLog>[] = [
    { key: "entityType", header: "Entity", render: (row) => row.entityType },
    { key: "action", header: "Action", render: (row) => row.action ?? "—" },
    { key: "actorId", header: "Actor", render: (row) => row.actorId ?? "System" },
    {
      key: "createdAt",
      header: "When",
      render: (row) => (row.createdAt ? formatDateTime(row.createdAt) : "—"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & audit logs"
        description="A trail of significant actions across the platform."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="max-w-xs">
            <Select
              value={entityType || "all"}
              onValueChange={(v) => setEntityType(v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border">
            <DataTable
              columns={columns}
              data={logs}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              emptyState={
                <EmptyState
                  icon={FileClock}
                  title="No audit log entries"
                  description="Activity will show up here as it happens."
                />
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
