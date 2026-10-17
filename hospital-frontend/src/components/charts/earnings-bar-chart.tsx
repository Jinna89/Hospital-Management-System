"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface EarningsPoint {
  label: string;
  consultations: number;
  earnings: number;
}

export default function EarningsBarChart({ data }: { data: EarningsPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f8" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#4b5876" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#4b5876"
            width={70}
            tickFormatter={(v) => formatCurrency(v as number)}
          />
          <Tooltip
            formatter={(value, name) =>
              name === "earnings" ? formatCurrency(Number(value ?? 0)) : value
            }
          />
          <Bar dataKey="earnings" radius={[6, 6, 0, 0]} fill="#1b2cc1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
