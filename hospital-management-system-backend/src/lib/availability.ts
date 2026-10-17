import type { Prisma, PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { releaseExpiredHolds } from './appointment-holds';
import {
  dayOfWeekForDate,
  generateSlots,
  parseDateOnly,
  slotStartsAt,
  type TimeSlot,
} from './schedule';

type Db = PrismaClient | Prisma.TransactionClient;

export interface SlotAvailability extends TimeSlot {
  available: boolean;
}

/** Is `date` inside any of the doctor's leave periods? */
export async function isOnLeave(db: Db, doctorId: string, date: Date): Promise<boolean> {
  const leave = await db.doctorLeave.findFirst({
    where: { doctorId, startDate: { lte: date }, endDate: { gte: date } },
    select: { id: true },
  });
  return leave !== null;
}

/**
 * Every consultation slot the doctor offers on `dateOnly`, each flagged
 * bookable or not. A slot is unavailable when it is already held by another
 * appointment or when it starts in the past (hospital local time).
 */
export async function getDaySlots(
  db: Db,
  doctorId: string,
  dateOnly: string,
  now: Date = new Date(),
): Promise<SlotAvailability[]> {
  const date = parseDateOnly(dateOnly);
  if (await isOnLeave(db, doctorId, date)) return [];

  const schedules = await db.doctorSchedule.findMany({
    where: { doctorId, dayOfWeek: dayOfWeekForDate(date), isActive: true },
  });
  if (schedules.length === 0) return [];

  await releaseExpiredHolds(db, { doctorId, appointmentDate: date }, now);
  const held = await db.appointment.findMany({
    where: { doctorId, appointmentDate: date, holdsSlot: true },
    select: { startTime: true },
  });
  const heldStarts = new Set(held.map((row) => row.startTime));

  return schedules
    .flatMap((schedule) => generateSlots(schedule))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((slot) => ({
      ...slot,
      available:
        !heldStarts.has(slot.startTime) &&
        slotStartsAt(dateOnly, slot.startTime, env.HOSPITAL_UTC_OFFSET_MINUTES) > now,
    }));
}

/** The slot object if `startTime` is one of the doctor's real slots that day, else undefined. */
export async function findSlot(
  db: Db,
  doctorId: string,
  dateOnly: string,
  startTime: string,
  now: Date = new Date(),
): Promise<SlotAvailability | undefined> {
  const slots = await getDaySlots(db, doctorId, dateOnly, now);
  return slots.find((slot) => slot.startTime === startTime);
}
