import type { paletteGroupsEn } from "./palette-groups.en.ts";
export const paletteGroupsZhCN = {
  "palette.groups.suggestions": "建议",
  "palette.groups.threads": "会话",
  "palette.groups.projects": "项目",
  "palette.groups.settings": "设置",
  "palette.groups.messages": "消息内",
  "palette.groups.directories": "目录",
  "palette.groups.actions": "操作",
  "palette.groups.recentThreads": "最近的会话",
} as const satisfies Record<keyof typeof paletteGroupsEn, string>;
