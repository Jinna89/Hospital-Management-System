"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, FlaskConical, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { labRequestSchema, type LabRequestValues } from "./schemas";

interface LabStepProps {
  isRequesting: boolean;
  isCompleting: boolean;
  hasRequested: boolean;
  onRequest: (values: LabRequestValues) => Promise<boolean>;
  onComplete: () => void;
}

export function LabStep({
  isRequesting,
  isCompleting,
  hasRequested,
  onRequest,
  onComplete,
}: LabStepProps) {
  const form = useForm<LabRequestValues>({
    resolver: zodResolver(labRequestSchema),
    defaultValues: { labTestId: "", notes: "" },
  });

  async function handleSubmit(values: LabRequestValues) {
    if (await onRequest(values)) form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">4. Request lab tests (optional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="labTestId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lab test</FormLabel>
                    <FormControl>
                      <Input placeholder="Lab test name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes for the lab (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" variant="outline" disabled={isRequesting}>
              {isRequesting ? <Loader2 className="animate-spin" /> : <FlaskConical />}
              Request lab test
            </Button>
          </form>
        </Form>

        {hasRequested ? (
          <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            Lab test requested. You can request more, or finish the consultation below.
          </p>
        ) : null}

        <div className="border-t border-border pt-4">
          <Button disabled={isCompleting} onClick={onComplete}>
            {isCompleting ? <Loader2 className="animate-spin" /> : <ClipboardList />}
            Finish & mark appointment completed
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
