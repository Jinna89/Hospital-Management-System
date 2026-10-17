import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for patients and hospitals. No hidden consultation fees — pay the doctor's listed rate online.",
  openGraph: {
    title: "MediCare HMS Pricing",
    description:
      "Simple, transparent pricing for patients and hospitals — no hidden consultation fees.",
    type: "website",
  },
};

const plans = [
  {
    name: "Patients",
    price: "Free",
    tagline: "Always free to search, book, and manage your care.",
    features: [
      "Unlimited doctor search & filtering",
      "Online appointment booking",
      "Secure online payment per visit",
      "Prescription & lab report history",
      "Appointment reminders & notifications",
    ],
    cta: { label: "Create patient account", href: "/register" },
    highlighted: false,
  },
  {
    name: "Doctors",
    price: "By invitation",
    tagline: "Doctor accounts are created and verified by hospital administration.",
    features: [
      "Full schedule & leave management",
      "Consultation & prescription tools",
      "Lab test requests",
      "Patient history access (authorized)",
      "Appointment notifications",
    ],
    cta: { label: "Doctor login", href: "/login" },
    highlighted: true,
  },
  {
    name: "Hospital / Admin",
    price: "Custom",
    tagline: "For hospital administrators managing the full platform.",
    features: [
      "Doctor verification workflow",
      "Department & staff management",
      "Revenue & performance analytics",
      "Full audit log visibility",
      "Account suspension & access control",
    ],
    cta: { label: "Admin login", href: "/login" },
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-navy via-primary to-accent px-4 py-16 text-white sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple pricing, no surprises
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-white/85">
              Patients only ever pay the doctor&apos;s listed consultation fee — shown up front,
              charged once, confirmed instantly.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted ? "border-primary shadow-md ring-1 ring-primary/30" : ""
                }
              >
                <CardHeader>
                  {plan.highlighted && (
                    <Badge variant="accent" className="mb-2 w-fit">
                      Most common
                    </Badge>
                  )}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-2xl font-bold text-navy">{plan.price}</p>
                  <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link href={plan.cta.href}>
                      {plan.cta.label} <ArrowRight />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
