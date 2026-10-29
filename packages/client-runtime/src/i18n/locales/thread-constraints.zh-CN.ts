import type { threadConstraintsEn } from "./thread-constraints.en.ts";
export const threadConstraintsZhCN = {
  "thread.constraints.this-environment-s-server-does-not-support-settling-yet-update-the-server-to-use-settle":
    "此环境的服务器尚不支持收起会话。请更新服务器以使用收起功能。",
  "thread.constraints.this-thread-is-working-interrupt-it-first-then-try-again":
    "此会话正在工作中。请先中断它，然后重试。",
  "thread.constraints.this-environment-s-server-does-not-support-snoozing-yet-update-the-server-to-use-snooze":
    "此环境的服务器尚不支持稍后处理会话。请更新服务器以使用稍后处理功能。",
  "thread.constraints.this-thread-is-waiting-on-you-respond-to-the-pending-request-before-snoozing-it":
    "此会话正在等待你的响应。请先响应待办请求，再将其稍后处理。",
  "thread.constraints.this-thread-is-still-starting-a-turn-try-again-once-it-s-running":
    "此会话仍在启动一轮对话。请在它开始运行后重试。",
  "thread.constraints.could-not-wake-thread": "无法唤醒会话",
  "thread.constraints.this-environment-s-server-does-not-support-snoozing-yet-update-the-server-to-wake-this-thread":
    "此环境的服务器尚不支持稍后处理会话。请更新服务器以唤醒此会话。",
  "thread.constraints.the-thread-could-not-be-woken": "此会话无法被唤醒。",
  "thread.constraints.could-not-pin-thread": "无法置顶会话",
  "thread.constraints.this-environment-s-server-does-not-support-pinning-yet-update-the-server-to-use-pin":
    "此环境的服务器尚不支持置顶会话。请更新服务器以使用置顶功能。",
  "thread.constraints.the-thread-could-not-be-pinned": "此会话无法被置顶。",
  "thread.constraints.could-not-unpin-thread": "无法取消置顶会话",
  "thread.constraints.the-thread-could-not-be-unpinned": "此会话无法取消置顶。",
  "thread.constraints.could-not-update-auto-settle": "无法更新自动收起设置",
  "thread.constraints.this-environment-s-server-does-not-support-turning-auto-settle-off-per-thread-yet-update-the-server-to-use-it":
    "此环境的服务器尚不支持按会话关闭自动收起。请更新服务器以使用该功能。",
  "thread.constraints.the-auto-settle-setting-could-not-be-changed": "自动收起设置无法更改。",
  "thread.constraints.could-not-regenerate-title": "无法重新生成标题",
  "thread.constraints.this-environment-s-server-does-not-support-title-regeneration-yet-update-the-server-to-regenerate-thread-titles":
    "此环境的服务器尚不支持重新生成标题。请更新服务器以重新生成会话标题。",
  "thread.constraints.the-thread-title-could-not-be-regenerated": "此会话标题无法重新生成。",
  "thread.constraints.thread-title-cannot-be-empty": "会话标题不能为空。",
  "thread.constraints.could-not-move-thread": "无法移动会话",
  "thread.constraints.this-environment-s-server-does-not-support-reordering-these-threads-update-the-server-to-arrange-them":
    "此环境的服务器尚不支持重新排列这些会话。请更新服务器以调整它们的顺序。",
  "thread.constraints.the-thread-could-not-be-moved": "此会话无法被移动。",
} as const satisfies Record<keyof typeof threadConstraintsEn, string>;
