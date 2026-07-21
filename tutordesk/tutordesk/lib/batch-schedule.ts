import type { Weekday } from "@/lib/generated/prisma/enums";

type SchedulableBatch = { startDate: Date; endDate: Date | null; isRecurring: boolean; recurringDays: Weekday[] };

const dayNumbers: Record<Weekday, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

export function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isScheduledSession(batch: SchedulableBatch, dateValue: string) {
  const date = parseDate(dateValue);
  const start = parseDate(toDateString(batch.startDate));
  const end = batch.endDate ? parseDate(toDateString(batch.endDate)) : null;
  if (date < start || (end && date > end)) return false;
  if (!batch.isRecurring) return dateValue === toDateString(batch.startDate);
  return batch.recurringDays.some((day) => dayNumbers[day] === date.getUTCDay());
}

export function getScheduledDates(batch: SchedulableBatch, fromValue: string, toValue: string) {
  const dates: string[] = [];
  const from = parseDate(fromValue);
  const to = parseDate(toValue);
  for (const cursor = new Date(from); cursor <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const value = toDateString(cursor);
    if (isScheduledSession(batch, value)) dates.push(value);
  }
  return dates;
}

export function getAttendanceWindowSessions(batch: SchedulableBatch, todayValue: string) {
  if (!batch.isRecurring) return [toDateString(batch.startDate)];
  const today = parseDate(todayValue);
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  const currentWeekStart = new Date(today);
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - mondayOffset);
  const windowStart = new Date(currentWeekStart);
  windowStart.setUTCDate(windowStart.getUTCDate() - 28);
  const windowEnd = new Date(currentWeekStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 12);
  const sessions: string[] = [];

  for (const cursor = new Date(windowStart); cursor <= windowEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const value = toDateString(cursor);
    if (isScheduledSession(batch, value)) sessions.push(value);
  }
  return sessions;
}
