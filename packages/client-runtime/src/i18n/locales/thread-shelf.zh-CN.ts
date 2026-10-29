import type { threadShelfEn } from "./thread-shelf.en.ts";
export const threadShelfZhCN = {
  "thread.shelf.count_one": "{{count}} 个{{state}}会话",
  "thread.shelf.count_other": "{{count}} 个{{state}}会话",
  "thread.shelf.collapse": "收起{{state}}会话。",
  "thread.shelf.expand": "展开{{state}}会话。",
  "thread.title.regenerating": "正在重新生成…",
  "thread.title.regenerate": "重新生成标题",
} as const satisfies Record<keyof typeof threadShelfEn, string>;
