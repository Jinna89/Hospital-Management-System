"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAppointments } from "@/lib/api/appointments";
import { usePagination } from "@/hooks/use-pagination";
import { formatDateTime } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types/api";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked in" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
  { value: "RESCHEDULED", label: "Rescheduled" },
];

export default function PatientAppointmentsPage() {
  const { page, status, sortBy, sortOrder, setPage, setStatus, toggleSort } = usePagination(10);

  const { data, isLoading } = useQuery({
    queryKey: ["patient", "appointments", { page, status }],
    queryFn: () =>
      listAppointments({
        page,
        limit: 10,
        status: status ? (status as AppointmentStatus) : undefined,
      }),
  });

  const fetchedAppointments = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  // No sort params on GET /appointments, so the fetched page is sorted
  // client-side; the sort state itself is still URL-synced via usePagination.
  const appointments = [...fetchedAppointments].sort((a, b) => {
    if (sortBy !== "appointmentDate") return 0;
    const cmp = a.appointmentDate.localeCompare(b.appointmentDate);
    return sortOrder === "asc" ? cmp : -cmp;
  });

  const columns: DataTableColumn<Appointment>[] = [
    {
      key: "doctor",
      header: "Doctor",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">
            {row.doctor?.name ? `Dr. ${row.doctor.name}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">{row.doctor?.specialty ?? ""}</p>
        </div>
      ),
    },
    {
      key: "appointmentDate",
      header: "Date & time",
      sortable: true,
      render: (row) => formatDateTime(row.appointmentDate),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/patient/appointments/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My appointments"
        description="Track, pay for, and manage all of your appointments."
        actions={
          <Button asChild>
            <Link href="/patient/doctors">
              <Stethoscope /> Book new appointment
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:max-w-xs">
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
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

      <div className="rounded-lg border border-border">
        <DataTable
          columns={columns}
          data={appointments}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={toggleSort}
          emptyState={
            <EmptyState
              icon={CalendarDays}
              title="No appointments found"
              description="Book an appointment with a verified doctor to see it here."
              action={
                <Button asChild size="sm">
                  <Link href="/patient/doctors">Browse doctors</Link>
                </Button>
              }
            />
          }
        />
      </div>
    </div>
  );
}
