// @effect-diagnostics globalDate:off -- A fixed instant keeps calendar-window assertions deterministic.
import { describe, expect, it, vi } from "vite-plus/test";

import {
  formatDayShort,
  formatHourShort,
  formatRelativeHourShort,
  formatUsd,
  makeWindow,
} from "./usageFormat.ts";

describe("hourly usage formatting", () => {
  it("keeps requested zones separate when formatting repeated calls", () => {
    const instant = "2026-08-11T12:37:00.000Z";
    for (const zone of ["UTC", "America/New_York", "Asia/Kathmandu", "UTC"]) {
      expect(formatHourShort(instant, zone)).toBe(
        new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric" }).format(
          new Date(instant),
        ),
      );
    }
    expect(() => formatHourShort(instant, "Etc/Unknown")).toThrow(RangeError);
    expect(formatHourShort("invalid", "UTC")).toBe("invalid");
    expect(formatHourShort(instant, "UTC", true, "zh-CN")).toContain("下午");
    expect(formatHourShort(instant, "UTC", false, "zh-CN")).toBe("12:00");
    expect(formatHourShort(instant, "UTC", true, "en-US")).toBe("12 PM");
    expect(formatDayShort("2026-08-11", "zh-CN")).toBe("8月11日");
    expect(formatDayShort("2026-08-11", "en-US")).toBe("Aug 11");
    expect(formatUsd(1234.5, "zh-CN")).toBe("US$1,234.50");
    expect(formatUsd(1234.5, "en-US")).toBe("$1,234.50");
    expect(
      formatRelativeHourShort(instant, "2026-08-12T12:00:00Z", "UTC", true, "zh-CN"),
    ).toContain("昨天");
  });

  it("disambiguates repeated hours during a fall-back transition", () => {
    expect(formatHourShort("2026-11-01T05:37:00.000Z", "America/New_York")).toBe("1 AM EDT");
    expect(formatHourShort("2026-11-01T06:37:00.000Z", "America/New_York")).toBe("1 AM EST");
    expect(formatHourShort("2026-11-01T05:37:00.000Z", "America/New_York", false)).toBe(
      "01:00 EDT",
    );
    expect(formatHourShort("2026-11-01T06:37:00.000Z", "America/New_York", false)).toBe(
      "01:00 EST",
    );
    expect(
      formatHourShort("2026-11-01T05:37:00.000Z", "America/New_York", false, "zh-CN"),
    ).not.toBe(formatHourShort("2026-11-01T06:37:00.000Z", "America/New_York", false, "zh-CN"));
  });

  it("builds an exact minute-aligned 24-hour request", () => {
    const window = makeWindow(1, new Date("2026-08-11T12:37:42.123Z"), "hour");

    expect(window.resolution).toBe("hour");
    expect(window.sinceTime).toBe("2026-08-10T12:37:00.000Z");
    expect(window.untilTime).toBe("2026-08-11T12:37:00.000Z");
  });

  it("degrades an unknown resolved zone to UTC instead of crashing", () => {
    const resolved = new Intl.DateTimeFormat().resolvedOptions();
    const resolvedOptions = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({ ...resolved, timeZone: "Etc/Unknown" });

    try {
      const now = new Date("2026-08-11T12:37:42.123Z");

      expect(makeWindow(1, now, "hour").timeZone).toBe("UTC");
      expect(makeWindow(30, now).timeZone).toBe("UTC");
    } finally {
      resolvedOptions.mockRestore();
    }
  });
});
