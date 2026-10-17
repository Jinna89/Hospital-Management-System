"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId") ?? searchParams.get("appointment_id");

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-warning/10 text-warning">
          <XCircle className="size-8" />
        </div>
        <CardTitle className="text-xl">Payment cancelled</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Your payment was not completed and no charge was made. Your appointment is still on hold —
          you can try paying again whenever you&apos;re ready.
        </p>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          {appointmentId ? (
            <Button asChild>
              <Link href={`/patient/appointments/${appointmentId}`}>Retry payment</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/patient/appointments">Go to my appointments</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/patient">Back to dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
