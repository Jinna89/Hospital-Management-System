import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: "royal" | "periwinkle" | "sky" | "navy";
}

const ACCENT_BG: Record<string, string> = {
  royal: "bg-primary/10 text-primary",
  periwinkle: "bg-accent/15 text-accent",
  sky: "bg-secondary/40 text-navy",
  navy: "bg-navy/10 text-navy",
};

export function StatCard({ label, value, icon: Icon, trend, accent = "royal" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {trend ? <p className="mt-1 text-xs text-muted-foreground">{trend}</p> : null}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            ACCENT_BG[accent]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
