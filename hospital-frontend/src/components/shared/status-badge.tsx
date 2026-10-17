import { Badge, type BadgeProps } from "@/components/ui/badge";
import { toTitleCase } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, BadgeProps["variant"]> = {
  // appointments
  PENDING_PAYMENT: "warning",
  CONFIRMED: "accent",
  CHECKED_IN: "secondary",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
  RESCHEDULED: "warning",
  // users / verification
  ACTIVE: "success",
  SUSPENDED: "warning",
  DEACTIVATED: "destructive",
  VERIFIED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
  // payments
  PAID: "success",
  FAILED: "destructive",
  REFUNDED: "muted",
  // lab
  REQUESTED: "muted",
  SAMPLE_COLLECTED: "secondary",
  RESULT_AVAILABLE: "success",
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge variant="muted">Unknown</Badge>;
  return <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>{toTitleCase(status)}</Badge>;
}
