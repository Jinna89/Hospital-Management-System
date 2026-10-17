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
import { complaintSchema, type ComplaintValues } from "./schemas";

interface ComplaintStepProps {
  isPending: boolean;
  onSubmit: (values: ComplaintValues) => void;
}

export function ComplaintStep({ isPending, onSubmit }: ComplaintStepProps) {
  const form = useForm<ComplaintValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: { chiefComplaint: "" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">1. Chief complaint</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="chiefComplaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What is the patient presenting with today?</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Check />}
              Start consultation
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
