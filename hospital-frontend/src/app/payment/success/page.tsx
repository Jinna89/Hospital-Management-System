import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentSuccessContent } from "./payment-success-content";

export const metadata: Metadata = {
  title: "Payment Successful",
  robots: { index: false, follow: false },
};

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-16">
      <Suspense fallback={<div className="h-64 w-full max-w-md" />}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
