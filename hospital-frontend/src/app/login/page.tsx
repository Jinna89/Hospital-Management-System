import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Stethoscope } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { DemoLoginButtons } from "./demo-login-buttons";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Sign in to your MediCare HMS account to manage appointments, consultations, and more.",
};

export default function LoginPage() {
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
          <CardTitle className="text-2xl">Welcome back 👋</CardTitle>
          <CardDescription>Login to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Suspense fallback={<div className="h-44" />}>
            <LoginForm />
          </Suspense>

          <div className="relative py-1 text-center">
            <span className="relative z-10 bg-card px-3 text-xs font-medium text-muted-foreground uppercase">
              Or
            </span>
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          </div>

          <div className="space-y-3">
            <p className="text-center text-sm font-semibold text-foreground">🚀 Quick demo login</p>
            <Suspense fallback={<div className="h-20" />}>
              <DemoLoginButtons />
            </Suspense>
            <p className="text-center text-xs text-muted-foreground">
              One click signs you in with a working seeded account for that role — no typing
              required.
            </p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Register as a patient
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
