import type { Metadata } from "next";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Create a free MediCare HMS patient account to book appointments with verified doctors.",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-navy via-primary to-accent px-4 py-12 sm:px-6">
      <Link href="/" className="mb-6 flex items-center gap-2 font-bold text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
          <Stethoscope className="h-5 w-5" />
        </span>
        <span className="text-lg">MediCare HMS</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Register as a patient to start booking appointments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RegisterForm />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
