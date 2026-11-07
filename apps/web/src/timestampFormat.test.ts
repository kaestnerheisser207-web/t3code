import { describe, expect, it } from "vite-plus/test";
import { webI18n } from "./i18n";
import {
  formatShortTimestamp,
  formatDayAwareTimestamp,
  formatRelativeTimeLabel,
  formatUpcomingTimestamp,
} from "./timestampFormat";

it("updates cached date and relative-time labels when the interface language changes", async () => {
  const at = "2026-10-27T08:30:00.000Z";
  const now = Date.parse("2026-10-28T08:30:00.000Z");
  try {
    await webI18n.changeLanguage("en");
    const english = formatShortTimestamp(at, "12-hour");
    expect(english).toBe(
      new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(at)),
    );
    await webI18n.changeLanguage("zh-CN");
    expect(formatShortTimestamp(at, "12-hour")).toBe(
      new Intl.DateTimeFormat("zh-CN", { hour: "numeric", minute: "2-digit", hour12: true }).format(
        new Date(at),
      ),
    );
    expect(formatDayAwareTimestamp(at, "24-hour", now)).toContain("昨天");
    expect(formatRelativeTimeLabel(at, now)).toBe("1 天前");
    await webI18n.changeLanguage("en");
    expect(formatShortTimestamp(at, "12-hour")).toBe(english);
  } finally {
    await webI18n.changeLanguage("en");
  }
});

describe("timestamps in an explicit time zone", () => {
  // 23:00 UTC on July 1 is 7 PM on July 1 in New York, whatever the host zone.
  const now = Date.parse("2026-07-01T23:00:00.000Z");
  const zone = "America/New_York";

  it("picks relative days from the calendar in that zone", () => {
    expect(formatUpcomingTimestamp("2026-07-02T00:30:00.000Z", "12-hour", now, zone)).not.toMatch(
      /tomorrow/,
    );
    expect(formatUpcomingTimestamp("2026-07-02T05:30:00.000Z", "12-hour", now, zone)).toMatch(
      /^tomorrow at /,
    );
    expect(formatDayAwareTimestamp("2026-07-01T03:30:00.000Z", "12-hour", now, zone)).toMatch(
      /^yesterday at /,
    );
  });
});
