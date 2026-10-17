import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  CalendarCheck,
  CreditCard,
  Stethoscope,
  FileText,
  FlaskConical,
  Bell,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore everything MediCare HMS offers patients, doctors, and hospital administrators — from booking to payments to analytics.",
  openGraph: {
    title: "MediCare HMS Services",
    description:
      "Everything MediCare HMS offers patients, doctors, and hospital administrators — from booking to payments to analytics.",
    type: "website",
  },
};

const services = [
  {
    icon: Search,
    title: "Doctor discovery",
    body: "Search and filter doctors by department, specialty, consultation fee, and years of experience.",
  },
  {
    icon: CalendarCheck,
    title: "Smart scheduling",
    body: "Doctors define weekly availability, breaks, and leave — the system computes real bookable slots automatically.",
  },
  {
    icon: CreditCard,
    title: "Secure online payments",
    body: "Consultation fees are paid online via SSLCommerz. Appointments are confirmed only after payment is verified server-side.",
  },
  {
    icon: Stethoscope,
    title: "Consultation workflow",
    body: "Doctors check patients in, record symptoms and diagnosis, and move consultations through a controlled status flow.",
  },
  {
    icon: FileText,
    title: "Prescriptions",
    body: "Digital prescriptions with medicine, dosage, frequency, duration, and instructions — visible to the patient immediately.",
  },
  {
    icon: FlaskConical,
    title: "Laboratory workflow",
    body: "Doctors request lab tests; results move from requested to sample collected to available, visible to the patient when ready.",
  },
  {
    icon: Bell,
    title: "Notifications",
    body: "Patients and doctors are notified of bookings, confirmations, cancellations, and completed consultations.",
  },
  {
    icon: ShieldCheck,
    title: "Admin oversight",
    body: "Hospital administrators verify doctors, manage departments and accounts, and review revenue and audit reports.",
  },
];

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-navy via-primary to-accent px-4 py-16 text-white sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">What we offer</h1>
            <p className="mx-auto mt-4 max-w-2xl text-white/85">
              Every core hospital workflow, end to end — for patients, doctors, and administrators.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Card key={s.title}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-2xl bg-muted/50 px-8 py-12 text-center">
            <h2 className="text-2xl font-bold text-navy">Ready to try it?</h2>
            <p className="mt-2 text-muted-foreground">
              Create an account or use a one-click demo login to explore every role.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/register">
                  Create account <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">Try a demo login</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
