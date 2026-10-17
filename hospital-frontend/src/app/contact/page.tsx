import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ContactForm } from "./contact-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the MediCare HMS team for support, partnerships, or general inquiries.",
  openGraph: {
    title: "Contact MediCare HMS",
    description:
      "Get in touch with the MediCare HMS team for support, partnerships, or general inquiries.",
    type: "website",
  },
};

const info = [
  { icon: Mail, label: "Email", value: "support@medicare-hms.test" },
  { icon: Phone, label: "Phone", value: "+880 1700-000000" },
  { icon: MapPin, label: "Address", value: "Gulshan, Dhaka, Bangladesh" },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-navy via-primary to-accent px-4 py-16 text-white sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Get in touch</h1>
            <p className="mx-auto mt-4 max-w-2xl text-white/85">
              Questions about your account, a booking, or partnering with us? Send a message and
              we&apos;ll get back to you.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            {info.map((item) => (
              <Card key={item.label}>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <ContactForm />
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
