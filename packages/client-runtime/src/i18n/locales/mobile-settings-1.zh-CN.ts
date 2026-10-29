import type { mobileSettings1En } from "./mobile-settings-1.en.ts";

export const mobileSettings1ZhCN = {
  "mobile.settings.ThreadSettingsSections.labs": "实验功能",
  "mobile.settings.ThreadSettingsSections.usage-limits": "用量上限",
  "mobile.settings.ThreadSettingsSections.resume-after-usage-limits": "用量限制解除后继续",
  "mobile.settings.ThreadSettingsSections.snooze-until-limits-reset": "稍后处理至用量上限重置",
  "mobile.settings.ThreadSettingsSections.auto-settle": "自动收起",
  "mobile.settings.ThreadSettingsSections.auto-settle-merged-threads": "自动收起已合并的会话",
  "mobile.settings.ThreadSettingsSections.auto-settle-inactive-threads": "自动收起无活动的会话",
  "mobile.settings.ThreadSettingsSections.inactive-days": "无活动天数",
  "mobile.settings.ThreadSettingsSections.across-environments": "跨环境",
  "mobile.settings.ThreadSettingsSections.auto-settle-defaults-differ": "自动收起默认值不一致",
  "mobile.settings.ThreadSettingsSections.apply-auto-settle-defaults": "应用自动收起默认值",
  "mobile.settings.ThreadSettingsSections.sidebar": "侧栏",
  "mobile.settings.ThreadSettingsSections.working-section": "进行中分区",
  "mobile.settings.ThreadSettingsSections.fold-working-and-monitoring-threads-into-a-working-section-they-return-to-the-top-of-the-list-when-they-need-you-while-this-is-on-active-threads-are-ordered-by-time-and-cannot-be-moved":
    "将进行中和监控中的会话归入“进行中”分区。当它们需要你处理时，会回到列表顶部。开启此项期间，活动会话按时间排序，且无法手动移动。",
  "mobile.settings.ThreadSettingsSections.new-threads": "新建会话",
  "mobile.settings.ThreadSettingsSections.use-last-project": "使用上次的项目",
  "mobile.settings.ThreadSettingsSections.start-new-threads-in-the-last-project-you-used-on-this-device":
    "在此设备上，使用你最近一次用过的项目开始新会话。",
  "mobile.settings.ThreadSettingsSections.beta-linked-environments": "Beta：关联环境",
  "mobile.settings.ThreadSettingsSections.let-agents-on-a-machine-work-on-your-other-machines-and-theirs-on-it-turn-it-on-for-each-machine-while-it-is-off-nothing-new-starts-over-a-link-tasks-already-running-finish":
    "允许一台机器上的编程代理在其他机器上工作，也让其他机器的代理在此机器上工作。请为每台机器分别开启。关闭期间，不会通过链接启动新任务；已在运行的任务会继续完成。",
  "mobile.settings.ThreadSettingsSections.legacy": "旧版",
  "mobile.settings.ThreadSettingsSections.plan-mode": "计划模式",
  "mobile.settings.ThreadSettingsSections.opt-into-retired-interfaces-kept-for-compatibility-plan-mode-restores-the-build-plan-control-otherwise-every-task-runs-in-build-mode":
    "选择启用为兼容性而保留的已停用界面。计划模式会恢复“构建/计划”开关；否则所有任务都在构建模式下运行。",
  "mobile.settings.AutoSettleDaysField.days-before-auto-settle": "自动收起前的天数",
  "mobile.settings.BranchNamingSettings.worktree-branch-naming": "工作树分支命名",
  "mobile.settings.BranchNamingSettings.mixed": "混合",
  "mobile.settings.BranchNamingSettings.use-t3-or-t3-for-t3-add-search-leave-empty-for-no-prefix":
    "为 t3/add-search 使用 t3 或 t3/ 前缀。留空则不加前缀。",
  "mobile.settings.BranchNamingSettings.branch-prefix": "分支前缀",
  "mobile.settings.BranchNamingSettings.append-instructions-to-the-naming-prompt":
    "在命名提示词后追加说明。",
  "mobile.settings.BranchNamingSettings.branch-naming-instructions": "分支命名说明",
  "mobile.settings.DatabaseStorageNotice.reclaim-database-space": "回收数据库空间",
  "mobile.settings.DatabaseStorageNotice.old-history-is-cleaned-up-automatically-but-these-databases-still-hold-the-freed-space-run-the-command-on-each-machine-to-return-it-to-disk-it-pauses-and-restarts-the-background-service-quit-the-desktop-app-first-if-it-hosts-the-environment":
    "旧历史记录会被自动清理，但这些数据库仍占用已释放的空间。请在每台机器上运行该命令，将空间归还给磁盘；该命令会暂停并重启后台服务。如果桌面版负责托管该环境，请先退出桌面版。",
  "mobile.settings.DatabaseStorageNotice.dismiss": "关闭",
  "mobile.settings.ScheduledTaskPromptField.prompt": "提示词",
  "mobile.settings.ScheduledTaskPromptField.what-should-the-agent-do-each-time":
    "编程代理每次应该做什么？",
  "mobile.settings.SettingsEnvironmentFilterHeader.filter-settings-environments-and-projects":
    "筛选设置中的环境和项目",
  "mobile.settings.SettingsEnvironmentFilterHeader.settings-scope": "设置范围",
  "mobile.settings.SettingsLegalDocumentRouteScreen.close-legal-document": "关闭法律文档",
  "mobile.settings.SettingsLegalDocumentRouteScreen.open-legal-documents-in-external-browser":
    "在外部浏览器中打开法律文档",
  "mobile.settings.SettingsLegalDocumentRouteScreen.try-again": "重试",
  "mobile.settings.SettingsLegalDocumentRouteScreen.open-in-browser": "在浏览器中打开",
  "mobile.settings.SettingsProjectOverridesSection.project": "项目",
  "mobile.settings.SettingsProjectOverridesSection.use-defaults": "使用默认值",
  "mobile.settings.SettingsProjectOverridesSection.use-environment-defaults-for-this-project":
    "为此项目使用环境默认值",
} as const satisfies Record<keyof typeof mobileSettings1En, string>;
