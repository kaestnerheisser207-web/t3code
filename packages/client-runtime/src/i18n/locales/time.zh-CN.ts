import type { timeEn } from "./time.en.ts";

export const timeZhCN = {
  "time.yesterday": "昨天 {{time}}",
  "time.tomorrow": "明天 {{time}}",
  "time.justNow": "刚刚",
  "time.minutesAgo_one": "{{count}} 分钟前",
  "time.minutesAgo_other": "{{count}} 分钟前",
  "time.hoursAgo_one": "{{count}} 小时前",
  "time.hoursAgo_other": "{{count}} 小时前",
  "time.daysAgo_one": "{{count}} 天前",
  "time.daysAgo_other": "{{count}} 天前",
  "context.autoCompactThreshold": "用量达到约 {{tokens}} tokens 时自动压缩。",
  "context.modelAutoCompact": "{{model}} 的上下文会在需要时自动压缩。",
  "context.autoCompact": "上下文会在需要时自动压缩。",
  "context.usedTokens": "上下文窗口已使用 {{tokens}} tokens",
  "context.usagePercent": "上下文窗口使用率：{{percent}}%",
  "context.unknownLimit": "上下文窗口大小未知",
} as const satisfies Record<keyof typeof timeEn, string>;
