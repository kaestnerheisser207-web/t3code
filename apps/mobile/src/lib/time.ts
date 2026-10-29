import type { TFunction } from "i18next";

export function relativeTime(input: string, t?: TFunction): string {
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) {
    return t ? t("time.short.lessMinute") : "<1m";
  }

  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (deltaSeconds < 60) return t ? t("time.short.lessMinute") : "<1m";

  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60)
    return t ? t("time.short.minutes", { count: deltaMinutes }) : `${deltaMinutes}m`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return t ? t("time.short.hours", { count: deltaHours }) : `${deltaHours}h`;

  const deltaDays = Math.floor(deltaHours / 24);
  return t ? t("time.short.days", { count: deltaDays }) : `${deltaDays}d`;
}
