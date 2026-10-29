import type { workspaceCompoundEn } from "./workspace-compound.en.ts";
export const workspaceCompoundZhCN = {
  "workspace.cloneDescription": "克隆 {{project}}，并复制 Git 未跟踪的本地文件。",
  "workspace.folderOn": "{{machine}} 上的文件夹",
  "workspace.otherMachine": "另一台机器",
  "workspace.machine": "机器",
  "workspace.firstFiles_one": "显示前 {{count}} 个文件。",
  "workspace.firstFiles_other": "显示前 {{count}} 个文件。",
  "workspace.cloneTo": "克隆到 {{machine}}",
  "workspace.starting": "正在启动…",
  "workspace.cloneFailed": "无法启动克隆。",
  "workspace.checkout": "检出 {{kind}}",
  "workspace.createRef": "创建新引用“{{name}}”",
  "diff.turn": "第 {{count}} 轮",
  "diff.truncated": "此预览超出大小限制。显示的内容并不完整。",
  "diff.truncatedWithTotals": "此预览超出大小限制。显示的内容并不完整。总计涵盖全部更改。",
  "diff.omittedFiles": "此工具调用更改了 {{total}} 个文件，记录的补丁中有 {{omitted}} 个被省略。",
} as const satisfies Record<keyof typeof workspaceCompoundEn, string>;
