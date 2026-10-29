import type { threadNoticeEn } from "./thread-notice.en.ts";
export const threadNoticeZhCN = {
  "thread.notice.settled": "会话已收起",
  "thread.notice.snoozed": "会话已稍后处理",
  "thread.notice.unpinned": "已取消置顶会话",
  "thread.notice.undo": "撤销",
  "thread.failure.archive": "会话归档失败。",
  "thread.failure.unarchive": "取消归档失败。",
  "thread.failure.delete": "会话删除失败。",
  "thread.failure.settle": "会话收起失败。",
  "thread.failure.unsettle": "取消收起失败。",
} as const satisfies Record<keyof typeof threadNoticeEn, string>;
