import type { Metadata } from "next";
import { HeartPulse, Target, Users, Award } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about MediCare HMS — our mission to connect patients, doctors and hospital staff on one secure, modern platform.",
  openGraph: {
    title: "About MediCare HMS",
    description:
      "Our mission to connect patients, doctors and hospital staff on one secure, modern platform.",
    type: "website",
  },
};

const values = [
  {
    icon: Target,
    title: "Our mission",
    body: "Make quality healthcare easier to reach by removing the friction between patients, doctors, and hospital administration.",
  },
  {
    icon: Users,
    title: "Who we serve",
    body: "Patients looking for trustworthy care, doctors who want less admin overhead, and hospital staff who need full operational visibility.",
  },
  {
    icon: Award,
    title: "What sets us apart",
    body: "Real-time availability, verified doctor profiles, secure online payments, and an append-only audit trail for every sensitive action.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-navy via-primary to-accent px-4 py-16 text-white sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <HeartPulse className="size-3.5" /> About MediCare HMS
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Built to make hospital operations work for everyone
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-white/85">
              MediCare HMS is a hospital &amp; doctor management platform that brings booking,
              consultations, prescriptions, lab workflows, and payments together in one secure
              system.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {values.map((v) => (
              <Card key={v.title}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <v.icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-muted/40 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl space-y-4 text-center">
            <h2 className="text-2xl font-bold text-navy">Why hospitals choose MediCare HMS</h2>
            <p className="text-muted-foreground">
              Every workflow is built around real hospital operations rather than generic CRUD
              screens: double-booking is prevented at the database level, payments are verified
              server-side before any appointment is confirmed, and every sensitive action — a doctor
              verification, a status change, a cancellation — is written to a permanent audit log
              that administrators can review at any time.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
