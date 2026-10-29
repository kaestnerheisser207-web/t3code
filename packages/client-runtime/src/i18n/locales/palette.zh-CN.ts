import type { paletteEn } from "./palette.en.ts";
export const paletteZhCN = {
  "palette.newThreadIn": "选择项目并新建会话…",
  "palette.newThreadProject": "在 {{project}} 中新建会话",
  "palette.triage": "排查问题",
  "palette.onMachine": "在 {{machine}} 上",
  "palette.thisMachine": "本机",
  "palette.untitled": "未命名会话",
  "palette.alias.newTask": "新建任务 对话 聊天 创建 项目",
  "palette.alias.addProject": "文件夹 克隆 仓库 git",
  "palette.alias.settings": "偏好 设置 配置",
  "palette.alias.appearance": "主题 颜色 深色 浅色",
  "palette.alias.environments": "连接 服务器 远程",
  "palette.alias.scheduledTasks": "计划 自动化 定时 重复",
  "palette.alias.usage": "额度 用量 账户 配额",
  "palette.alias.archive": "恢复 历史 归档",
  "palette.alias.triage": "排查问题 缺陷 问题 报告 故障 调试 帮助 支持",
} as const satisfies Record<keyof typeof paletteEn, string>;
