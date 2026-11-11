const messageFormatters = new Map<
  string | undefined,
  {
    readonly time: Intl.DateTimeFormat;
    readonly date: Intl.DateTimeFormat;
    readonly dateWithYear: Intl.DateTimeFormat;
  }
>();

function formattersFor(locale: string | undefined) {
  const cached = messageFormatters.get(locale);
  if (cached) return cached;
  const formatters = {
    time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }),
    date: new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }),
    dateWithYear: new Intl.DateTimeFormat(locale, {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    }),
  };
  messageFormatters.set(locale, formatters);
  return formatters;
}

/** Time only for today's messages; older ones lead with the day and month. */
export function formatMessageTimestamp(
  input: string,
  nowMs: number = Date.now(),
  locale?: string,
): string {
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) return "";
  const date = new Date(timestamp);
  const now = new Date(nowMs);
  const formatters = formattersFor(locale);
  const time = formatters.time.format(date);
  if (date.toDateString() === now.toDateString()) return time;
  const sameYear = date.getFullYear() === now.getFullYear();
  return `${(sameYear ? formatters.date : formatters.dateWithYear).format(date)} ${time}`;
}
