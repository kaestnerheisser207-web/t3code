import type { settingsCompoundEn } from "./settings-compound.en.ts";
export const settingsCompoundZhCN = {
  "settings.compound.noHosts": "没有主机与“{{query}}”匹配。",
  "settings.compound.addProvider": "在 {{environment}} 上添加账户或配置提供方。",
  "settings.compound.addHub":
    "在 {{environment}} 的提供方旁显示此聚合服务中各账户的配额。密钥保留在该服务器上。",
} as const satisfies Record<keyof typeof settingsCompoundEn, string>;
