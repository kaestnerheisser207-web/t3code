import type { mobileCompoundEn } from "./mobile-compound.en.ts";
export const mobileCompoundZhCN = {
  "mobile.settings.dynamic.version": "版本 {{version}}",
  "mobile.settings.dynamic.enterCode": "请在登录页面输入验证码 {{code}}。",
  "mobile.settings.dynamic.filter": "筛选 {{index}}",
  "mobile.settings.dynamic.lastRunFailed": "上次运行失败：{{error}}",
  "mobile.settings.dynamic.legalLoadFailed": "无法加载{{document}}。",
} as const satisfies Record<keyof typeof mobileCompoundEn, string>;
