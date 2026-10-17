import type { DayOfWeek } from '@prisma/client';
import { AppError } from '../utils/AppError';

/** Index matches `Date#getUTCDay()` (0 = Sunday). */
export const DAYS_OF_WEEK: readonly DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function dayOfWeekToIndex(day: DayOfWeek): number {
  return DAYS_OF_WEEK.indexOf(day);
}

export function indexToDayOfWeek(index: number): DayOfWeek {
  const day = DAYS_OF_WEEK[index];
  if (!day) throw AppError.badRequest(`Invalid day of week: ${index}`);
  return day;
}

/** Parses `YYYY-MM-DD` into a UTC-midnight Date, rejecting impossible dates like 2026-02-31. */
export function parseDateOnly(value: string): Date {
  if (!DATE_PATTERN.test(value)) throw AppError.badRequest('Date must use the YYYY-MM-DD format');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatDateOnly(date) !== value) {
    throw AppError.badRequest(`Invalid calendar date: ${value}`);
  }
  return date;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayOfWeekForDate(date: Date): DayOfWeek {
  return indexToDayOfWeek(date.getUTCDay());
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * The real-world instant a slot starts at, given the hospital's UTC offset
 * (e.g. 360 for Asia/Dhaka). Slots are stored as wall-clock strings, so this
 * is what "is this slot in the past?" must be compared against.
 */
export function slotStartsAt(dateOnly: string, time: string, utcOffsetMinutes: number): Date {
  const base = parseDateOnly(dateOnly).getTime();
  return new Date(base + timeToMinutes(time) * 60_000 - utcOffsetMinutes * 60_000);
}

/** Today's calendar date in the hospital's timezone, as `YYYY-MM-DD`. */
export function hospitalToday(now: Date, utcOffsetMinutes: number): string {
  return formatDateOnly(new Date(now.getTime() + utcOffsetMinutes * 60_000));
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface ScheduleWindow {
  startTime: string;
  endTime: string;
  consultationDurationMins: number;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
}

/** Validates a window's internal consistency; throws a 422-style error otherwise. */
export function assertValidWindow(window: ScheduleWindow): void {
  const start = timeToMinutes(window.startTime);
  const end = timeToMinutes(window.endTime);
  if (end <= start) throw AppError.unprocessable('Schedule end time must be after its start time');
  if (window.consultationDurationMins > end - start) {
    throw AppError.unprocessable('Consultation duration is longer than the schedule window');
  }
  const hasBreakStart = Boolean(window.breakStartTime);
  const hasBreakEnd = Boolean(window.breakEndTime);
  if (hasBreakStart !== hasBreakEnd) {
    throw AppError.unprocessable('A break needs both a start and an end time');
  }
  if (window.breakStartTime && window.breakEndTime) {
    const breakStart = timeToMinutes(window.breakStartTime);
    const breakEnd = timeToMinutes(window.breakEndTime);
    if (breakEnd <= breakStart || breakStart < start || breakEnd > end) {
      throw AppError.unprocessable(
        'Break must sit inside the schedule window and end after it starts',
      );
    }
  }
}

/** Splits a window into consecutive consultation slots, skipping any that touch the break. */
export function generateSlots(window: ScheduleWindow): TimeSlot[] {
  const start = timeToMinutes(window.startTime);
  const end = timeToMinutes(window.endTime);
  const duration = window.consultationDurationMins;
  const breakStart = window.breakStartTime ? timeToMinutes(window.breakStartTime) : null;
  const breakEnd = window.breakEndTime ? timeToMinutes(window.breakEndTime) : null;

  const slots: TimeSlot[] = [];
  for (let cursor = start; cursor + duration <= end; cursor += duration) {
    const slotEnd = cursor + duration;
    const touchesBreak =
      breakStart !== null && breakEnd !== null && cursor < breakEnd && slotEnd > breakStart;
    if (!touchesBreak) {
      slots.push({ startTime: minutesToTime(cursor), endTime: minutesToTime(slotEnd) });
    }
  }
  return slots;
}

/** Two same-day windows overlap when each starts before the other ends. */
export function windowsOverlap(a: ScheduleWindow, b: ScheduleWindow): boolean {
  return (
    timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
  );
}
