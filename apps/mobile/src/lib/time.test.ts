import { createI18n } from "@t3tools/client-runtime/i18n";
import { expect, it, vi } from "vite-plus/test";
import { relativeTime } from "./time";

it("keeps elapsed-time boundaries and invalid dates consistent across languages", () => {
  const now = Date.parse("2026-10-29T00:00:00Z");
  using _clock = vi.spyOn(Date, "now").mockReturnValue(now);
  const en = createI18n("en").t;
  const zh = createI18n("zh-CN").t;
  for (const [seconds, english, chinese] of [
    [-60, "<1m", "<1分钟"],
    [59, "<1m", "<1分钟"],
    [60, "1m", "1分钟"],
    [3599, "59m", "59分钟"],
    [3600, "1h", "1小时"],
    [86399, "23h", "23小时"],
    [86400, "1d", "1天"],
  ] as const) {
    const input = new Date(now - seconds * 1000).toISOString();
    expect(relativeTime(input)).toBe(english);
    expect(relativeTime(input, en)).toBe(english);
    expect(relativeTime(input, zh)).toBe(chinese);
  }
  expect(relativeTime("invalid", zh)).toBe("<1分钟");
});
