import type { TFunction } from "i18next";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatScheduledTaskInterval(everyMs: number, t: TFunction): string {
  const units = [
    [7 * DAY, "week"],
    [DAY, "day"],
    [HOUR, "hour"],
    [MINUTE, "minute"],
    [1_000, "second"],
    [1, "millisecond"],
  ] as const;
  let remaining = everyMs;
  const parts: string[] = [];
  for (const [size, unit] of units) {
    const count = Math.floor(remaining / size);
    if (count === 0) continue;
    parts.push(t(`schedule.${unit}`, { count }));
    remaining %= size;
  }
  return t("schedule.every", { interval: parts.join(" ") });
}

function localCalendarDay(date: Date): number {
  // Compare calendar days, not 24-hour spans: DST days can have 23 or 25 hours.
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;
}

export function formatNextScheduledTaskRun(
  nextRunAt: string,
  now: number,
  t: TFunction,
  locale: string,
): string {
  const next = new Date(nextRunAt);
  const current = new Date(now);
  const remaining = next.getTime() - now;
  if (!Number.isFinite(remaining)) return t("schedule.nextUnavailable");
  if (remaining <= 0) return t("schedule.nextDue");

  const days = localCalendarDay(next) - localCalendarDay(current);
  if (days === 0) {
    if (remaining < MINUTE) return t("schedule.nextSoon");
    const unit = remaining < HOUR ? "minute" : "hour";
    const count = Math.round(remaining / (remaining < HOUR ? MINUTE : HOUR));
    return t(unit === "minute" ? "schedule.nextMinutes" : "schedule.nextHours", { count });
  }

  const time = next.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12,
  });
  if (days === 1) return t("schedule.nextTomorrow", { time });
  if (days <= 7) {
    return t("schedule.nextWeekday", {
      weekday: next.toLocaleDateString(locale, { weekday: "long" }),
      time,
    });
  }
  const date = next.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...(next.getFullYear() !== current.getFullYear() ? { year: "numeric" as const } : {}),
  });
  return t("schedule.nextDate", { date, time });
}
