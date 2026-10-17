"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Pill, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prescriptionSchema, type PrescriptionValues } from "./schemas";

interface PrescriptionStepProps {
  isPending: boolean;
  isSaved: boolean;
  onSubmit: (values: PrescriptionValues) => void;
  onContinue: () => void;
}

const EMPTY_ITEM = { medicineId: "", dosage: "", frequency: "", duration: "", instructions: "" };
const MAX_ITEMS = 10;

const ITEM_FIELDS = [
  { name: "medicineId", label: "Medicine", placeholder: "Medicine name" },
  { name: "dosage", label: "Dosage", placeholder: "e.g. 500mg" },
  { name: "frequency", label: "Frequency", placeholder: "e.g. twice daily" },
  { name: "duration", label: "Duration", placeholder: "e.g. 5 days" },
] as const;

export function PrescriptionStep({
  isPending,
  isSaved,
  onSubmit,
  onContinue,
}: PrescriptionStepProps) {
  const form = useForm<PrescriptionValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: { notes: "", items: [EMPTY_ITEM] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">3. Prescription</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {isSaved ? (
          <>
            <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              Prescription saved for this consultation.
            </p>
            <Button variant="outline" onClick={onContinue}>
              Continue to lab tests
            </Button>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"
                >
                  {ITEM_FIELDS.map(({ name, label, placeholder }) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={`items.${index}.${name}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input placeholder={placeholder} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <FormField
                    control={form.control}
                    name={`items.${index}.instructions`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Instructions (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-fit text-destructive hover:text-destructive sm:col-span-2"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-3.5" /> Remove medicine
                    </Button>
                  ) : null}
                </div>
              ))}
              {fields.length < MAX_ITEMS ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(EMPTY_ITEM)}
                >
                  <Pill className="size-3.5" /> Add another medicine
                </Button>
              ) : null}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>General notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : <Check />}
                Save prescription & continue
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
