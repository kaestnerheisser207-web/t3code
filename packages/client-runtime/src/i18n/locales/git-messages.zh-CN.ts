import type { gitMessagesEn } from "./git-messages.en.ts";
export const gitMessagesZhCN = {
  "web.git.provider-status-unavailable-open-settings-source-control-and-rescan":
    "提供方状态不可用。请打开“设置”→“源代码管理”并重新扫描。",
  "web.git.commit-changes": "提交更改",
  "web.git.review-and-confirm-your-commit-leave-the-message-blank-to-auto-generate-one":
    "请检查并确认提交。留空提交信息将自动生成。",
  "web.git.an-error-occurred": "发生错误。",
  "web.git.open-settings-source-control-to-configure-this-provider":
    "请打开“设置”→“源代码管理”来配置此提供方。",
  "web.git.only-invited-people": "仅受邀者",
  "web.git.anyone-on-the-web": "网络上的任何人",
  "web.git.repository-published": "仓库已发布",
  "web.git.repository-created": "仓库已创建",
  "web.git.cancel": "取消",
  "web.git.this-connection-cannot-change-source-control": "此连接无法更改源代码管理。",
  "web.git.this-action-is-currently-unavailable": "此操作当前不可用。",
  "web.git.action-failed": "操作失败",
  "web.git.pull-failed": "拉取失败",
  "web.git.already-up-to-date": "已是最新",
  "web.git.editor-opening-is-unavailable": "编辑器打开不可用。",
  "web.git.unable-to-open-file": "无法打开文件",
  "web.git.git-initialization-failed": "Git 初始化失败",
  "web.git.initialize-git": "初始化 Git",
  "web.git.run-action-on-default-branch": "要在默认分支上运行操作吗？",
} as const satisfies Record<keyof typeof gitMessagesEn, string>;
