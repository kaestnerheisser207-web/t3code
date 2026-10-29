import type { prCheckoutEn } from "./pr-checkout.en.ts";
export const prCheckoutZhCN = {
  "pr.checkout.title": "检出 {{kind}}",
  "pr.checkout.description": "解析 {{provider}} {{kind}}，然后在主仓库或专用工作树中创建草稿会话。",
  "pr.checkout.empty": "粘贴 {{kind}} URL、检出命令，或输入 123 / #123。",
  "pr.checkout.invalid": "请使用 {{kind}} URL、检出命令、123 或 #123。",
  "pr.checkout.failed": "准备 {{kind}} 会话失败。",
  "pr.checkout.placeholder": "{{shortLabel}} URL、检出命令或 #42",
  "pr.checkout.resolving": "正在解析 {{kind}}...",
  "pr.checkout.local": "本地",
  "pr.checkout.worktree": "工作树",
  "pr.checkout.preparingLocal": "正在准备本地目录…",
  "pr.checkout.preparingWorktree": "正在准备工作树…",
} as const satisfies Record<keyof typeof prCheckoutEn, string>;
