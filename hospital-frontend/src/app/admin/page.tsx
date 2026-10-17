"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Activity, CalendarCheck, CreditCard, Stethoscope, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardStats, getRevenueReport } from "@/lib/api/admin";
import { formatCurrency } from "@/lib/utils";

// Recharts (+ d3) is ~90kB of JS that only this page needs — loading it via
// next/dynamic keeps it out of this route's initial bundle so the stat cards
// render and become interactive before the charting library even downloads.
const RevenueAreaChart = dynamic(() => import("@/components/charts/revenue-area-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

function last30DaysRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function AdminOverviewPage() {
  const range = last30DaysRange();

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const { data: revenueRes, isLoading: revenueLoading } = useQuery({
    queryKey: ["admin", "revenue-report", range],
    queryFn: () => getRevenueReport(range),
  });

  const stats = statsRes?.data ?? null;
  const revenuePoints = (revenueRes?.data ?? []).map((point) => ({
    label: point.date ?? point.period ?? "",
    revenue: point.revenue ?? point.amount ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Platform-wide activity and revenue at a glance." />

      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total patients"
            value={stats?.totalPatients ?? 0}
            icon={Users}
            accent="royal"
          />
          <StatCard
            label="Total doctors"
            value={stats?.totalDoctors ?? 0}
            icon={Stethoscope}
            accent="periwinkle"
          />
          <StatCard
            label="Total appointments"
            value={stats?.totalAppointments ?? 0}
            icon={CalendarCheck}
            accent="sky"
          />
          <StatCard
            label="Today's appointments"
            value={stats?.todaysAppointments ?? 0}
            icon={Activity}
            accent="navy"
          />
          <StatCard
            label="Monthly revenue"
            value={stats ? formatCurrency(stats.monthlyRevenue) : "—"}
            icon={CreditCard}
            accent="royal"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue — last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {revenueLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : revenuePoints.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No revenue recorded in this period yet.
            </p>
          ) : (
            <RevenueAreaChart data={revenuePoints} />
          )}
        </CardContent>
      </Card>

      {stats?.paymentSuccessRate != null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment success rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.round(stats.paymentSuccessRate * 100))}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {Math.round(stats.paymentSuccessRate * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
