import { cn } from "@/lib/utils";

export const CONSULTATION_STEPS = [
  { key: "complaint", label: "Chief complaint" },
  { key: "clinical", label: "Diagnosis & notes" },
  { key: "prescription", label: "Prescription" },
  { key: "labs", label: "Lab tests" },
] as const;

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Consultation progress">
      {CONSULTATION_STEPS.map((step, index) => (
        <li
          key={step.key}
          aria-current={index === current ? "step" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
            index === current
              ? "border-primary bg-primary text-primary-foreground"
              : index < current
                ? "border-success/40 bg-success/10 text-success"
                : "border-border text-muted-foreground"
          )}
        >
          {index + 1}. {step.label}
        </li>
      ))}
    </ol>
  );
}
