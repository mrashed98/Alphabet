/**
 * Notification timing helpers — shared between Edge Functions.
 *
 * Contacts (birthdays):  T-7d, T-1d, day-of
 * Life events:           T-1month (if notify_1_month), T-7d (if notify_1_week), T-1d (if notify_1_day)
 *
 * All scheduled_for values are adjusted for user quiet hours:
 * if the computed time falls in [quiet_hours_start, quiet_hours_end) the notification
 * is pushed forward to quiet_hours_end on the same (or next) day.
 */

export type NotificationLabel = "T-1month" | "T-7d" | "T-1d" | "day-of";

export interface ScheduledSlot {
  label: NotificationLabel;
  scheduledFor: Date;
}

/** Parse a Postgres `time` column value like "22:00:00" → { hours, minutes }. */
function parseTime(t: string | null): { h: number; m: number } | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return { h, m };
}

/**
 * Given a naive "desired" Date, shift it past quiet hours if necessary.
 * quiet_hours_start / quiet_hours_end are in UTC (Supabase stores them as time without time zone).
 * We treat them as UTC for simplicity (mobile UX shows them in local time — acceptable for MVP).
 */
function respectQuietHours(
  desired: Date,
  quietStart: string | null,
  quietEnd: string | null,
): Date {
  const qs = parseTime(quietStart);
  const qe = parseTime(quietEnd);
  if (!qs || !qe) return desired;

  const result = new Date(desired);
  const h = result.getUTCHours();
  const m = result.getUTCMinutes();
  const desiredMins = h * 60 + m;
  const startMins = qs.h * 60 + qs.m;
  const endMins = qe.h * 60 + qe.m;

  const inQuiet = startMins <= endMins
    ? desiredMins >= startMins && desiredMins < endMins   // same day window
    : desiredMins >= startMins || desiredMins < endMins;  // overnight window

  if (!inQuiet) return result;

  // Push to quiet_hours_end
  result.setUTCHours(qe.h, qe.m, 0, 0);
  // If we crossed midnight (overnight window and end < start), add a day
  if (endMins < startMins && desiredMins >= startMins) {
    result.setUTCDate(result.getUTCDate() + 1);
  }
  return result;
}

/** Default notification hour when we have a date but no explicit time: 09:00 UTC. */
const DEFAULT_HOUR = 9;

function dateAtHour(d: Date, hour = DEFAULT_HOUR): Date {
  const r = new Date(d);
  r.setUTCHours(hour, 0, 0, 0);
  return r;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ContactBirthdaySlots {
  birthday: string; // "YYYY-MM-DD" — next occurrence computed by caller
  quietStart: string | null;
  quietEnd: string | null;
}

/**
 * Returns the T-7d, T-1d, and day-of slots for a birthday.
 * `birthday` must be the NEXT occurrence (YYYY-MM-DD) — caller is responsible.
 * Only future slots (> now) are returned.
 */
export function contactNotificationSlots(
  opts: ContactBirthdaySlots,
): ScheduledSlot[] {
  const { birthday, quietStart, quietEnd } = opts;
  const base = new Date(`${birthday}T00:00:00Z`);
  const now = new Date();

  const candidates: Array<{ label: NotificationLabel; raw: Date }> = [
    { label: "T-7d", raw: dateAtHour(addDays(base, -7)) },
    { label: "T-1d", raw: dateAtHour(addDays(base, -1)) },
    { label: "day-of", raw: dateAtHour(base) },
  ];

  return candidates
    .map(({ label, raw }) => ({
      label,
      scheduledFor: respectQuietHours(raw, quietStart, quietEnd),
    }))
    .filter(({ scheduledFor }) => scheduledFor > now);
}

export interface LifeEventSlotOpts {
  eventDate: string; // "YYYY-MM-DD" — next occurrence
  notify1Month: boolean;
  notify1Week: boolean;
  notify1Day: boolean;
  quietStart: string | null;
  quietEnd: string | null;
}

/**
 * Returns configured advance-notice slots for a life event.
 * Only future slots (> now) are returned.
 */
export function lifeEventNotificationSlots(
  opts: LifeEventSlotOpts,
): ScheduledSlot[] {
  const { eventDate, notify1Month, notify1Week, notify1Day, quietStart, quietEnd } = opts;
  const base = new Date(`${eventDate}T00:00:00Z`);
  const now = new Date();

  const candidates: Array<{ label: NotificationLabel; enabled: boolean; raw: Date }> = [
    { label: "T-1month", enabled: notify1Month, raw: dateAtHour(addMonths(base, -1)) },
    { label: "T-7d", enabled: notify1Week, raw: dateAtHour(addDays(base, -7)) },
    { label: "T-1d", enabled: notify1Day, raw: dateAtHour(addDays(base, -1)) },
  ];

  return candidates
    .filter(({ enabled }) => enabled)
    .map(({ label, raw }) => ({
      label,
      scheduledFor: respectQuietHours(raw, quietStart, quietEnd),
    }))
    .filter(({ scheduledFor }) => scheduledFor > now);
}

/**
 * Compute the next annual occurrence of a "MM-DD" or "YYYY-MM-DD" birthday/anniversary
 * relative to today (UTC).  If today IS the date, returns today.
 */
export function nextAnnualOccurrence(dateStr: string): string {
  // Normalise to MM-DD
  const mmdd = dateStr.length === 10 ? dateStr.slice(5) : dateStr;
  const [mm, dd] = mmdd.split("-").map(Number);
  const today = new Date();
  const year = today.getUTCFullYear();

  let candidate = new Date(Date.UTC(year, mm - 1, dd));
  const todayMidnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (candidate < todayMidnight) {
    candidate = new Date(Date.UTC(year + 1, mm - 1, dd));
  }
  return candidate.toISOString().slice(0, 10);
}
