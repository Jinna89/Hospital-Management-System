"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getMyDoctorProfile, updateMyDoctorProfile } from "@/lib/api/doctors";
import { updateMyProfile } from "@/lib/api/users";
import { getApiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { initials } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  phone: z.string().min(7, "Enter a valid phone number").max(20, "Enter a valid phone number"),
  specialty: z.string().min(2, "Specialty is required"),
  department: z.string().optional(),
  experienceYears: z
    .string()
    .refine((v) => v === "" || Number(v) >= 0, "Must be a positive number")
    .optional(),
  consultationFee: z
    .string()
    .refine((v) => v === "" || Number(v) >= 0, "Must be a positive number")
    .optional(),
  bio: z.string().max(1000, "Keep your bio under 1000 characters").optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const updateUser = useAuthStore((s) => s.updateUser);
  const queryClient = useQueryClient();

  const { data: doctorRes, isLoading } = useQuery({
    queryKey: ["doctor", "me", "profile"],
    queryFn: getMyDoctorProfile,
  });

  const doctor = doctorRes?.data ?? null;

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      specialty: "",
      department: "",
      experienceYears: "",
      consultationFee: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (!doctor && !user) return;
    form.reset({
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      specialty: doctor?.specialty ?? "",
      department: doctor?.department ?? "",
      experienceYears: doctor?.experienceYears != null ? String(doctor.experienceYears) : "",
      consultationFee: doctor?.consultationFee != null ? String(doctor.consultationFee) : "",
      bio: doctor?.bio ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor, user]);

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileValues) => {
      const userRes = await updateMyProfile({ name: values.name, phone: values.phone });
      const doctorRes = await updateMyDoctorProfile({
        specialty: values.specialty,
        department: values.department || undefined,
        experienceYears: values.experienceYears ? Number(values.experienceYears) : undefined,
        consultationFee: values.consultationFee ? Number(values.consultationFee) : undefined,
        bio: values.bio || undefined,
      });
      return { userRes, doctorRes };
    },
    onSuccess: ({ userRes }) => {
      updateUser(userRes.data);
      queryClient.invalidateQueries({ queryKey: ["doctor", "me", "profile"] });
      toast.success("Profile & availability settings saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[32rem] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile & availability"
        description="Keep your public profile accurate — patients see this when booking."
      />

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials(user?.name ?? "D")}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{user?.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {doctor?.verificationStatus ? (
              <Badge
                className="mt-1"
                variant={doctor.verificationStatus === "VERIFIED" ? "default" : "secondary"}
              >
                {doctor.verificationStatus}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Cardiology" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Internal Medicine" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of experience</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="consultationFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultation fee (BDT)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Tell patients about your background"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                Save changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="size-4" /> Manage weekly availability
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Set the days and hours you consult, and request leave, from the{" "}
            <a href="/doctor/schedule" className="font-medium text-primary hover:underline">
              Schedule &amp; leave
            </a>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
