"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAppointments, checkInAppointment } from "@/lib/api/appointments";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import type { Appointment } from "@/types/api";

export default function DoctorTasksPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["doctor", "appointments", "tasks"],
    queryFn: () => listAppointments({ page: 1, limit: 50 }),
  });

  const appointments = data?.data ?? [];
  const today = new Date().toDateString();
  const todaysAppointments = appointments.filter(
    (a) => new Date(a.appointmentDate).toDateString() === today
  );
  const active = appointments.filter((a) =>
    ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status)
  );
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;

  const checkInMutation = useMutation({
    mutationFn: (id: string) => checkInAppointment(id),
    onSuccess: () => {
      toast.success("Patient checked in");
      queryClient.invalidateQueries({ queryKey: ["doctor", "appointments"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const columns: DataTableColumn<Appointment>[] = [
    {
      key: "patient",
      header: "Patient",
      render: (row) => (
        <span className="font-medium text-foreground">{row.patient?.name ?? "Patient"}</span>
      ),
    },
    {
      key: "appointmentDate",
      header: "Date & time",
      render: (row) => formatDateTime(row.appointmentDate),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          {row.status === "CONFIRMED" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={checkInMutation.isPending}
              onClick={() => checkInMutation.mutate(row.id)}
            >
              Check in
            </Button>
          ) : null}
          <Button size="sm" asChild>
            <Link href={`/doctor/appointments/${row.id}`}>
              {row.status === "COMPLETED" ? "View" : "Start consultation"}
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My tasks"
        description="Appointments assigned to you, ready for consultation."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Today's appointments"
            value={todaysAppointments.length}
            icon={CalendarCheck}
            accent="royal"
          />
          <StatCard
            label="Active / upcoming"
            value={active.length}
            icon={Clock}
            accent="periwinkle"
          />
          <StatCard
            label="Completed consultations"
            value={completedCount}
            icon={CheckCircle2}
            accent="sky"
          />
        </div>
      )}

      <div className="rounded-lg border border-border">
        <DataTable
          columns={columns}
          data={active}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="No active appointments"
              description="Appointments assigned to you will show up here once patients book you."
            />
          }
        />
      </div>
    </div>
  );
}
