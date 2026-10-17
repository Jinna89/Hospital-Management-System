import { Skeleton } from "@/components/ui/skeleton";

export default function PrescriptionDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
