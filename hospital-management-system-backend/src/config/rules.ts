/** Business-rule constants, kept in one place so policy changes are one-line edits. */

/** An unpaid (PENDING_PAYMENT) booking releases its slot after this long. */
export const PENDING_PAYMENT_TTL_MINUTES = 15;

/** Cancelling at least this many hours before the slot earns a full refund. */
export const FULL_REFUND_WINDOW_HOURS = 24;

/** Patients may check in on the appointment day, but not earlier than this before the slot. */
export const CHECK_IN_OPENS_MINUTES_BEFORE = 60;

export const MAX_BOOKING_HORIZON_DAYS = 90;

/** A confirmed appointment can only be rescheduled this many hours (or more) before its slot. */
export const RESCHEDULE_MIN_HOURS_BEFORE = 12;
