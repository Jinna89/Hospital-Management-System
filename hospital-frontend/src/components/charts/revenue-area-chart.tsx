"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface RevenuePoint {
  label: string;
  revenue: number;
}

export default function RevenueAreaChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1b2cc1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#1b2cc1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f8" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#4b5876" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#4b5876"
            width={70}
            tickFormatter={(v) => formatCurrency(v as number)}
          />
          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#1b2cc1"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
