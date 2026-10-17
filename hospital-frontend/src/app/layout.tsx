import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://medicare-hms.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MediCare HMS — Hospital & Doctor Management System",
    template: "%s | MediCare HMS",
  },
  description:
    "MediCare HMS connects patients, doctors and hospital administrators on one platform for booking appointments, managing consultations, prescriptions and payments.",
  openGraph: {
    title: "MediCare HMS — Hospital & Doctor Management System",
    description:
      "Book doctors, manage appointments, consultations and payments in one modern healthcare platform.",
    siteName: "MediCare HMS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
