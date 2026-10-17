import Link from "next/link";
import type { Metadata } from "next";
import {
  HeartPulse,
  Stethoscope,
  CalendarCheck,
  ShieldCheck,
  CreditCard,
  FlaskConical,
  FileText,
  BarChart3,
  Search,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Search verified doctors, book appointments, pay online and manage your medical history — all on one platform.",
  openGraph: {
    title: "MediCare HMS — Search doctors, book appointments, pay online",
    description:
      "Search verified doctors, book appointments, pay online and manage your medical history — all on one platform.",
    type: "website",
  },
};

const patientFeatures = [
  { icon: Search, text: "Search & filter doctors by specialty, fee, and experience" },
  { icon: CalendarCheck, text: "View real-time availability and book instantly" },
  { icon: CreditCard, text: "Pay consultation fees securely online via SSLCommerz" },
  { icon: FileText, text: "Access prescriptions, lab reports & history anytime" },
];

const doctorFeatures = [
  { icon: Stethoscope, text: "Manage your weekly schedule, breaks & leave" },
  { icon: CalendarCheck, text: "View and manage assigned appointments" },
  { icon: FileText, text: "Record diagnoses and issue prescriptions" },
  { icon: FlaskConical, text: "Request lab tests as part of consultations" },
];

const adminFeatures = [
  { icon: ShieldCheck, text: "Verify doctors and manage staff accounts" },
  { icon: BarChart3, text: "Track revenue, appointments & performance" },
  { icon: HeartPulse, text: "Oversee departments and hospital policy" },
  { icon: FileText, text: "Review a full, append-only audit trail" },
];

function FeatureList({ items }: { items: { icon: typeof Search; text: string }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <item.icon className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="text-muted-foreground">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-primary to-accent px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            <HeartPulse className="size-3.5" /> Hospital &amp; Doctor Management, simplified
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Healthcare operations,
            <br className="hidden sm:block" /> run from one platform.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/85 sm:text-lg">
            Patients book and pay for appointments online. Doctors manage schedules and
            consultations. Admins run the whole hospital — all with role-based security and a full
            audit trail.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" variant="secondary" className="text-navy" asChild>
              <Link href="/register">
                Book an appointment <ArrowRight />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
              asChild
            >
              <Link href="/login">I&apos;m a doctor / admin</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/20">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-8 text-center sm:grid-cols-4 sm:px-6">
          {[
            ["7", "Departments"],
            ["20m", "Consultation slots"],
            ["3", "Role-based portals"],
            ["24/7", "Online booking"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-2xl font-bold text-primary">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-navy">
              Built for every role in the hospital
            </h2>
            <p className="mt-3 text-muted-foreground">
              One platform, three tailored experiences — patients, doctors, and administrators each
              get exactly what they need.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <Card className="border-primary/20">
              <CardContent className="space-y-4 pt-6">
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HeartPulse className="size-5" />
                </div>
                <h3 className="text-lg font-semibold">For Patients</h3>
                <FeatureList items={patientFeatures} />
              </CardContent>
            </Card>

            <Card className="border-accent/20">
              <CardContent className="space-y-4 pt-6">
                <div className="flex size-11 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Stethoscope className="size-5" />
                </div>
                <h3 className="text-lg font-semibold">For Doctors</h3>
                <FeatureList items={doctorFeatures} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex size-11 items-center justify-center rounded-lg bg-secondary text-navy">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="text-lg font-semibold">For Admins</h3>
                <FeatureList items={adminFeatures} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-navy">How it works</h2>
            <p className="mt-3 text-muted-foreground">
              From search to follow-up, in five simple steps.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Search", "Find a doctor by specialty, department, or name."],
              ["Book", "Pick an available slot and confirm your appointment."],
              ["Pay", "Pay securely online — confirmation is instant."],
              ["Consult", "Check in and meet your doctor, in person or via notes."],
              ["Follow up", "Get prescriptions, lab requests, and your full history."],
            ].map(([title, desc], i) => (
              <div key={title} className="relative rounded-xl border border-border bg-card p-5">
                <span className="mb-3 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h4 className="font-medium">{title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-navy">
              Security built in, not bolted on
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every action is protected by strict role-based access control and logged in an
              append-only audit trail — so sensitive medical and financial data stays exactly where
              it should.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Argon2-hashed passwords, rotating refresh tokens",
                "Doctors, patients, and admins each see only what they should",
                "Payments verified server-side — never trusted from the client",
                "Every sensitive action is permanently logged",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-0 bg-gradient-to-br from-navy via-primary to-accent text-white">
            <CardContent className="py-8">
              <ShieldCheck className="size-10" />
              <h3 className="mt-4 text-xl font-semibold">
                Role-based, audited, and built to prevent double-booking
              </h3>
              <p className="mt-2 text-sm text-white/85">
                The same appointment slot can never be booked twice — enforced at the database
                level, not just in the app.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-gradient-to-br from-navy via-primary to-accent px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight">Ready to get started?</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/85">
            Create your account and book your first appointment in under two minutes.
          </p>
          <Button size="lg" variant="secondary" className="mt-6 text-navy" asChild>
            <Link href="/register">
              Create free account <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
