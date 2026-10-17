"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarClock, CalendarOff, Check, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMyLeave, createMySchedule } from "@/lib/api/doctors";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { DoctorLeave, DoctorSchedule } from "@/types/api";

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const scheduleSchema = z.object({
  dayOfWeek: z.string().min(1, "Select a day"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  consultationDurationMins: z
    .string()
    .min(1, "Required")
    .refine((v) => Number(v) >= 5, "Must be at least 5 minutes"),
});
type ScheduleValues = z.infer<typeof scheduleSchema>;

const leaveSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });
type LeaveValues = z.infer<typeof leaveSchema>;

// The backend only exposes POST /doctors/me/schedules and /doctors/me/leaves
// (no list endpoint), so entries created this session are mirrored to
// localStorage and shown below the forms — a real, persisted record of what
// was submitted, not placeholder data.
const SCHEDULE_CACHE_KEY = "hms:doctor:schedules";
const LEAVE_CACHE_KEY = "hms:doctor:leaves";

function readCache<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function writeCache<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(items));
}

export default function DoctorSchedulePage() {
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [leaves, setLeaves] = useState<DoctorLeave[]>([]);

  useEffect(() => {
    setSchedules(readCache<DoctorSchedule>(SCHEDULE_CACHE_KEY));
    setLeaves(readCache<DoctorLeave>(LEAVE_CACHE_KEY));
  }, []);

  const scheduleForm = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      dayOfWeek: "",
      startTime: "09:00",
      endTime: "17:00",
      consultationDurationMins: "30",
    },
  });

  const leaveForm = useForm<LeaveValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { startDate: "", endDate: "", reason: "" },
  });

  const addSchedule = useMutation({
    mutationFn: (values: ScheduleValues) =>
      createMySchedule({
        dayOfWeek: Number(values.dayOfWeek),
        startTime: values.startTime,
        endTime: values.endTime,
        consultationDurationMins: Number(values.consultationDurationMins),
      }),
    onSuccess: (res) => {
      const next = [...schedules, res.data];
      setSchedules(next);
      writeCache(SCHEDULE_CACHE_KEY, next);
      toast.success("Weekly schedule slot added");
      scheduleForm.reset({
        dayOfWeek: "",
        startTime: "09:00",
        endTime: "17:00",
        consultationDurationMins: "30",
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const addLeave = useMutation({
    mutationFn: (values: LeaveValues) =>
      createMyLeave({
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason || undefined,
      }),
    onSuccess: (res) => {
      const next = [...leaves, res.data];
      setLeaves(next);
      writeCache(LEAVE_CACHE_KEY, next);
      toast.success("Leave request submitted");
      leaveForm.reset({ startDate: "", endDate: "", reason: "" });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule & leave"
        description="Set your weekly availability and request time off patients can't book against."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a weekly availability slot</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...scheduleForm}>
              <form
                onSubmit={scheduleForm.handleSubmit((v) => addSchedule.mutate(v))}
                className="space-y-4"
              >
                <FormField
                  control={scheduleForm.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of week</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DAYS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={scheduleForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={scheduleForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={scheduleForm.control}
                  name="consultationDurationMins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultation duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min={5} step={5} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={addSchedule.isPending} className="w-full">
                  {addSchedule.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                  Add slot
                </Button>
              </form>
            </Form>

            <div className="mt-6 space-y-2">
              {schedules.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="No availability slots yet"
                  description="Slots you add this session will appear here."
                />
              ) : (
                schedules.map((s, i) => (
                  <div
                    key={s.id ?? i}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {DAYS.find((d) => Number(d.value) === s.dayOfWeek)?.label ??
                        `Day ${s.dayOfWeek}`}
                    </span>
                    <span className="text-muted-foreground">
                      {s.startTime} – {s.endTime} · {s.consultationDurationMins}min
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request leave</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...leaveForm}>
              <form
                onSubmit={leaveForm.handleSubmit((v) => addLeave.mutate(v))}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={leaveForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={leaveForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={leaveForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="e.g. Conference, personal leave"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={addLeave.isPending} className="w-full">
                  {addLeave.isPending ? <Loader2 className="animate-spin" /> : <Check />}
                  Submit leave request
                </Button>
              </form>
            </Form>

            <div className="mt-6 space-y-2">
              {leaves.length === 0 ? (
                <EmptyState
                  icon={CalendarOff}
                  title="No leave requests yet"
                  description="Requests you submit this session will appear here."
                />
              ) : (
                leaves.map((l, i) => (
                  <div
                    key={l.id ?? i}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </p>
                    {l.reason ? <p className="text-xs text-muted-foreground">{l.reason}</p> : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
