"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { clinicalSchema, type ClinicalValues } from "./schemas";

interface ClinicalStepProps {
  isPending: boolean;
  onSubmit: (values: ClinicalValues) => void;
}

const FIELDS: { name: keyof ClinicalValues; label: string; rows: number }[] = [
  { name: "symptoms", label: "Symptoms", rows: 2 },
  { name: "diagnosis", label: "Diagnosis", rows: 2 },
  { name: "clinicalNotes", label: "Clinical notes", rows: 3 },
  { name: "treatmentPlan", label: "Treatment plan", rows: 2 },
];

export function ClinicalStep({ isPending, onSubmit }: ClinicalStepProps) {
  const form = useForm<ClinicalValues>({
    resolver: zodResolver(clinicalSchema),
    defaultValues: { symptoms: "", diagnosis: "", clinicalNotes: "", treatmentPlan: "" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">2. Diagnosis & clinical notes</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {FIELDS.map(({ name, label, rows }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Textarea rows={rows} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Check />}
              Save & continue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
