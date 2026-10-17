-- Users now carry their display name and phone number (previously the
-- registration payload's `name` was validated and then silently dropped).
ALTER TABLE "users" ADD COLUMN "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN "phone" TEXT;

UPDATE "users" u SET "name" = d."name" FROM "doctors" d WHERE d."userId" = u."id";
UPDATE "users" u SET "phone" = p."phone" FROM "patients" p WHERE p."userId" = u."id" AND p."phone" IS NOT NULL;
UPDATE "users" SET "name" = split_part("email", '@', 1) WHERE "name" = '';

ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "patients" DROP COLUMN "phone";

-- Appointments: free-text reason for the visit, and a nullable slot-hold flag
-- so that cancelled / rescheduled / no-show rows stop blocking their slot
-- while the database still rejects two *active* bookings for the same slot.
ALTER TABLE "appointments" ADD COLUMN "reason" TEXT,
ADD COLUMN "holdsSlot" BOOLEAN DEFAULT true;

UPDATE "appointments" SET "holdsSlot" = NULL
WHERE "status" IN ('CANCELLED', 'RESCHEDULED', 'NO_SHOW');

DROP INDEX "appointments_doctorId_appointmentDate_startTime_key";

CREATE UNIQUE INDEX "appointments_doctorId_appointmentDate_startTime_holdsSlot_key"
ON "appointments"("doctorId", "appointmentDate", "startTime", "holdsSlot");
