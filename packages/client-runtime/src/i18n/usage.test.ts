import { expect, it } from "vite-plus/test";
import { createI18n } from "./index.ts";
import { usageText, usageWindowLabel, usageResetCreditsSummary } from "./usage.ts";

it("localizes quota periods and durations while retaining model names and unknown diagnostics", () => {
  const zh = createI18n("zh-CN").t;
  expect(usageWindowLabel(zh, "Weekly · Fable")).toBe("每周额度 · Fable");
  expect(usageWindowLabel(zh, "Gemini · 5-hour")).toBe("Gemini · 5 小时额度");
  for (const value of ["team@example.com", "Team custom limit", "HTTP 429: upstream diagnostic"]) {
    expect(usageWindowLabel(zh, value)).toBe(value);
  }
  for (const [english, chinese] of [
    ["resets now", "现在重置"],
    ["Resets momentarily", "即将重置"],
    ["resets in 1h 5m", "1小时 5分钟后重置"],
    ["in 2d 0h", "2天 0小时后"],
    ["↻ 59m", "↻ 59分钟"],
  ]) {
    expect(usageText(zh, english!)).toBe(chinese);
    expect(usageText(createI18n("en").t, english!)).toBe(english);
  }
});

it("keeps reset credits separate from quota, including empty and expired summaries", () => {
  const now = Date.parse("2026-10-31T12:00:00Z");
  const zh = createI18n("zh-CN").t;
  const credits = { availableCount: 2, nextExpiresAt: "2026-10-31T13:00:00Z" };
  expect(usageResetCreditsSummary(zh, { availableCount: 0 }, now)).toBe("尚未累积重置券");
  expect(usageResetCreditsSummary(zh, credits, now)).toBe(
    "已累积 2 张重置券 · 最近一张将于1小时 0分钟后过期",
  );
  expect(usageResetCreditsSummary(zh, credits, now, true)).toBe("2 张重置券 · 1小时 0分钟后过期");
  expect(usageResetCreditsSummary(zh, credits, now + 3_600_000)).toContain("0分钟后过期");
  expect(usageResetCreditsSummary(createI18n("en").t, { availableCount: 1 }, now)).toBe(
    "1 reset credit banked",
  );
});
