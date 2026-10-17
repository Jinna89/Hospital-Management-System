import type { AppointmentStatus } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * The appointment lifecycle as an explicit state machine. Anything not
 * listed here is an invalid transition (e.g. COMPLETED -> PENDING_PAYMENT).
 */
const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'],
  CHECKED_IN: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
  RESCHEDULED: [],
};

/** Statuses that free up the doctor's slot for someone else to book. */
export const SLOT_RELEASING_STATUSES: readonly AppointmentStatus[] = [
  'CANCELLED',
  'RESCHEDULED',
  'NO_SHOW',
];

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: AppointmentStatus, to: AppointmentStatus): void {
  if (!canTransition(from, to)) {
    throw AppError.conflict(`Invalid status change: ${from} -> ${to}`);
  }
}

export function releasesSlot(status: AppointmentStatus): boolean {
  return SLOT_RELEASING_STATUSES.includes(status);
}
