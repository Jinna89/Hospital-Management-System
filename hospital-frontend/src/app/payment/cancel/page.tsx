import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentCancelContent } from "./payment-cancel-content";

export const metadata: Metadata = {
  title: "Payment Cancelled",
  robots: { index: false, follow: false },
};

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-16">
      <Suspense fallback={<div className="h-56 w-full max-w-md" />}>
        <PaymentCancelContent />
      </Suspense>
    </div>
  );
}
