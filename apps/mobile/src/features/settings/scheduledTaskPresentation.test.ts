import { describe, expect, it } from "vite-plus/test";

import { formatNextScheduledTaskRun } from "./scheduledTaskPresentation";

describe("formatNextScheduledTaskRun", () => {
  it("names the rounded unit for a run later today", () => {
    const now = new Date(2026, 10, 3, 10, 0, 0).getTime();
    const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString();
    expect(formatNextScheduledTaskRun(at(59), now)).toBe("Next run in 59 minutes");
    expect(formatNextScheduledTaskRun(at(59.5), now)).toBe("Next run in 1 hour");
    expect(formatNextScheduledTaskRun(at(150), now)).toBe("Next run in 3 hours");
  });
});

import { createI18n } from "@t3tools/client-runtime/i18n";
import { formatScheduledTaskInterval } from "./scheduledTaskPresentation";

it("formats mixed intervals in the selected language without changing their units", async () => {
  const instance = createI18n("zh-CN");
  expect(formatScheduledTaskInterval(90_000, instance.t)).toBe("每1 分钟 30 秒");
  await instance.changeLanguage("en");
  expect(formatScheduledTaskInterval(90_000, instance.t)).toBe("Every 1 minute 30 seconds");
});

it("uses calendar days across midnight and keeps due and unavailable states distinct", () => {
  const instance = createI18n("zh-CN");
  const now = new Date(2026, 9, 28, 23, 59).getTime();
  const next = new Date(2026, 9, 29, 0, 1).toISOString();
  expect(formatNextScheduledTaskRun(next, now, instance.t, "zh-CN")).toContain("明天");
  expect(formatNextScheduledTaskRun(new Date(now).toISOString(), now, instance.t, "zh-CN")).toBe(
    "已到下次运行时间",
  );
  expect(formatNextScheduledTaskRun("invalid", now, instance.t, "zh-CN")).toBe(
    "下次运行时间不可用",
  );
});
