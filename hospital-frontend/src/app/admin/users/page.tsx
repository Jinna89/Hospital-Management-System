"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, ShieldX, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listUsers, updateUserStatus, verifyDoctor } from "@/lib/api/admin";
import { usePagination } from "@/hooks/use-pagination";
import { getApiErrorMessage } from "@/lib/api-client";
import type { AuthUser, Role, UserStatus } from "@/types/api";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "PATIENT", label: "Patients" },
  { value: "DOCTOR", label: "Doctors" },
  { value: "ADMIN", label: "Admins" },
];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const {
    page,
    status: role,
    sortBy,
    sortOrder,
    setPage,
    setStatus: setRole,
    toggleSort,
  } = usePagination(10);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", { page, role }],
    queryFn: () => listUsers({ page, limit: 10, role: role ? (role as Role) : undefined }),
  });

  const fetchedUsers = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  // The backend's /admin/users has no sort params, so the current page is
  // sorted client-side; the sort key/direction itself still lives in the URL
  // (via usePagination/useQueryState) so the view stays bookmarkable.
  const users = [...fetchedUsers].sort((a, b) => {
    if (sortBy !== "name") return 0;
    const cmp = a.name.localeCompare(b.name);
    return sortOrder === "asc" ? cmp : -cmp;
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      updateUserStatus(id, status),
    onSuccess: (res) => {
      toast.success(`User ${res.data.status === "ACTIVE" ? "reactivated" : "suspended"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "VERIFIED" | "REJECTED" }) =>
      verifyDoctor(id, status),
    onSuccess: (res) => {
      toast.success(
        `Doctor ${res.data.verificationStatus === "VERIFIED" ? "verified" : "rejected"}`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const columns: DataTableColumn<AuthUser>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (row) => <StatusBadge status={row.role} /> },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          {row.role === "DOCTOR" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate({ id: row.id, status: "VERIFIED" })}
              >
                <ShieldCheck className="size-3.5" /> Verify
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate({ id: row.id, status: "REJECTED" })}
              >
                <ShieldX className="size-3.5" /> Reject
              </Button>
            </>
          ) : null}
          {row.status === "ACTIVE" ? (
            <ConfirmDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  Suspend
                </Button>
              }
              title={`Suspend ${row.name}?`}
              description="They will be unable to log in until reactivated."
              confirmLabel="Suspend"
              destructive
              onConfirm={async () => {
                await statusMutation.mutateAsync({ id: row.id, status: "SUSPENDED" });
              }}
            />
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ id: row.id, status: "ACTIVE" })}
            >
              Reactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage users & doctors"
        description="Review accounts, verify doctors, and manage access."
      />

      <div className="max-w-xs">
        <Select value={role || "all"} onValueChange={(v) => setRole(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
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
          data={users}
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
              icon={Users}
              title="No users found"
              description="Try a different role filter."
            />
          }
        />
      </div>
    </div>
  );
}
