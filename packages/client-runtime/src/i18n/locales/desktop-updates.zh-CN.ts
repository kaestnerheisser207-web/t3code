import type { desktopUpdatesEn } from "./desktop-updates.en.ts";
export const desktopUpdatesZhCN = {
  "desktop.updates.upToDate": "已是最新版本！",
  "desktop.updates.latest": "T3 Code {{version}} 目前是最新版本。",
  "desktop.updates.ok": "确定",
  "desktop.updates.failed": "更新检查失败",
  "desktop.updates.checkFailed": "无法检查更新。",
  "desktop.updates.unknown": "发生未知错误，请稍后重试。",
  "desktop.updates.unavailable": "更新不可用",
  "desktop.updates.disabled": "自动更新目前不可用。",
} as const satisfies Record<keyof typeof desktopUpdatesEn, string>;
