"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listDoctors, searchDoctors } from "@/lib/api/doctors";
import { usePagination } from "@/hooks/use-pagination";
import { initials, formatCurrency } from "@/lib/utils";

const SORT_OPTIONS: { value: string; label: string; sortBy: string; sortOrder: "asc" | "desc" }[] =
  [
    { value: "name-asc", label: "Name (A–Z)", sortBy: "name", sortOrder: "asc" },
    { value: "rating-desc", label: "Rating (highest first)", sortBy: "rating", sortOrder: "desc" },
    { value: "fee-asc", label: "Fee (lowest first)", sortBy: "consultationFee", sortOrder: "asc" },
  ];

export default function FindDoctorsPage() {
  const { page, search, setPage, setSearch, params, setParams } = usePagination(9);
  const specialty = params.specialty ?? "";
  const sortValue = params.sort ?? "name-asc";
  const activeSort = SORT_OPTIONS.find((o) => o.value === sortValue) ?? SORT_OPTIONS[0];

  // A real text search hits the dedicated /doctors/search endpoint across
  // the whole backend dataset (not just the current page), falling back to
  // the regular paginated/sorted/specialty-filtered listing once the search
  // box is empty. Previously this filtered only the current page's 9
  // results client-side, so searching page 2 for a doctor on page 1 (or any
  // doctor not already loaded) silently found nothing.
  const isSearching = Boolean(search);

  const { data, isLoading } = useQuery({
    queryKey: isSearching
      ? ["doctors", "search", search]
      : ["doctors", { page, specialty, sortValue }],
    queryFn: () =>
      isSearching
        ? searchDoctors(search)
        : listDoctors({
            page,
            limit: 9,
            specialty: specialty || undefined,
            sortBy: activeSort.sortBy,
            sortOrder: activeSort.sortOrder,
          }),
  });

  const filtered = data?.data ?? [];
  const totalPages = isSearching ? 1 : (data?.meta?.totalPages ?? 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a doctor"
        description="Browse verified doctors and book a consultation."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          defaultValue={search}
          placeholder="Search doctors by name..."
          onDebouncedChange={setSearch}
          className="sm:max-w-sm"
        />
        <SearchInput
          defaultValue={specialty}
          placeholder="Filter by specialty (e.g. Cardiology)"
          onDebouncedChange={(value) => setParams({ specialty: value || undefined, page: 1 })}
          className="sm:max-w-sm"
        />
        <Select value={sortValue} onValueChange={(v) => setParams({ sort: v, page: 1 })}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors found"
          description="Try a different name or specialty, or clear your filters."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doctor) => (
              <Link key={doctor.id} href={`/patient/doctors/${doctor.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-3 pt-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{initials(doctor.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">Dr. {doctor.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {doctor.specialty ?? "General Physician"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {doctor.rating?.toFixed(1) ?? "New"}
                      </span>
                      {doctor.verificationStatus === "VERIFIED" ? (
                        <Badge variant="success">Verified</Badge>
                      ) : null}
                    </div>
                    {doctor.consultationFee != null ? (
                      <p className="text-sm font-medium text-primary">
                        {formatCurrency(doctor.consultationFee)} / consultation
                      </p>
                    ) : null}
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
