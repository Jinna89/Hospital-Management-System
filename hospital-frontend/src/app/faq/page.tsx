import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about booking, payments, and accounts on MediCare HMS.",
  openGraph: {
    title: "MediCare HMS — Frequently Asked Questions",
    description:
      "Answers to common questions about booking, payments, and accounts on MediCare HMS.",
    type: "website",
  },
};

const faqs = [
  {
    q: "How do I book an appointment?",
    a: "Create a patient account, search for a doctor by name, specialty, or department, pick an available date and time slot, and confirm. You'll be asked to pay the consultation fee online to finalize the booking.",
  },
  {
    q: "How is payment handled?",
    a: "Payments are processed through SSLCommerz in test mode. Your appointment stays in a pending state until the payment gateway confirms the transaction — we never mark a booking as paid from the browser alone.",
  },
  {
    q: "Can I cancel or reschedule an appointment?",
    a: "Yes, from your Appointments page, as long as the appointment hasn't already been completed. Cancellation and rescheduling follow the hospital's appointment policy.",
  },
  {
    q: "How do doctor accounts get created?",
    a: "Doctor accounts are created by hospital administrators and must be verified before they appear in search results or can accept bookings.",
  },
  {
    q: "Where can I see my prescriptions and lab reports?",
    a: "Both are available from your patient dashboard once a doctor creates them during or after your consultation.",
  },
  {
    q: "Is my data secure?",
    a: "Passwords are hashed with Argon2, sessions use short-lived access tokens with rotating refresh tokens, and every sensitive action is recorded in an append-only audit log reviewed by administrators.",
  },
];

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-navy via-primary to-accent px-4 py-16 text-white sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently asked questions
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-white/85">
              Can&apos;t find what you&apos;re looking for? Reach out on the Contact page.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`item-${i}`}
                className="rounded-xl border border-border bg-card px-5"
              >
                <AccordionTrigger className="text-left font-medium">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
