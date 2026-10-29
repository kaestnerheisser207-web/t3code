import type { composerEn } from "./composer.en.ts";

export const composerZhCN = {
  "composer.ui.expand-composer": "展开输入框",
  "composer.ui.skill": "/skill:",
  "composer.ui.waiting-for-approval": "等待批准",
  "composer.ui.provider-process-is-gone-interrupt-or-restart-the-run-to-respond":
    "提供方进程已退出。请中断或重启本次运行后再回复。",
  "composer.ui.dismiss-question-without-answering": "不回答，直接关闭问题",
  "composer.ui.plan": "计划",
  "composer.ui.plan-actions": "计划操作",
  "composer.ui.download-as-markdown": "下载为 Markdown",
  "composer.ui.save-to-workspace": "保存到工作区",
  "composer.ui.save-plan-to-workspace": "将计划保存到工作区",
  "composer.ui.workspace-path": "工作区路径",
  "composer.ui.cancel": "取消",
  "composer.ui.context-window": "上下文窗口",
  "composer.ui.context-window-usage": "上下文窗口用量",
  "composer.ui.total-processed": "累计处理量",
  "composer.ui.cost": "费用",
  "composer.ui.compact-context": "压缩上下文",
  "composer.savePathDescription": "输入相对于<workspace/>的路径。",
  "composer.workspaceFallback": "工作区",
} as const satisfies Record<keyof typeof composerEn, string>;
