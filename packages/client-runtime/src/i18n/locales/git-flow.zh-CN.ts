import type { gitFlowEn } from "./git-flow.en.ts";
export const gitFlowZhCN = {
  "git.labels.commit": "提交",
  "git.labels.push": "推送",
  "git.labels.create": "创建 {{shortLabel}}",
  "git.labels.commitPush": "提交并推送",
  "git.labels.commitPushRequest": "提交、推送并创建 {{shortLabel}}",
  "git.labels.publish": "发布仓库",
  "git.labels.pushCreate": "推送并创建 {{shortLabel}}",
  "git.labels.sync": "同步引用",
  "git.labels.pull": "拉取",
  "git.labels.upToDate": "分支已是最新，无需操作。",
  "git.labels.diverged": "分支已与上游分叉，请先变基或合并。",
  "git.labels.pulling": "正在拉取最新变更……",
  "git.labels.starting": "正在启动源代码管理操作……",
  "git.default.commitPushTitle": "要提交并推送到默认引用吗？",
  "git.default.pushTitle": "要推送到默认引用吗？",
  "git.default.commitCreateTitle": "要在默认引用上提交、推送并创建 {{shortLabel}} 吗？",
  "git.default.pushCreateTitle": "要在默认引用上推送并创建 {{shortLabel}} 吗？",
  "git.default.commitPushDescription":
    "此操作将在“{{branch}}”上提交并推送变更。你可以继续在此引用上进行，也可以创建功能分支引用并在那里执行同样的操作。",
  "git.default.pushDescription":
    "此操作将推送“{{branch}}”上的本地提交。你可以继续在此引用上进行，也可以创建功能分支引用并在那里执行同样的操作。",
  "git.default.commitCreateDescription":
    "此操作将在“{{branch}}”上提交、推送并创建 {{kind}}。你可以继续在此引用上进行，也可以创建功能分支引用并在那里执行同样的操作。",
  "git.default.pushCreateDescription":
    "此操作将推送“{{branch}}”上的本地提交并创建 {{kind}}。你可以继续在此引用上进行，也可以创建功能分支引用并在那里执行同样的操作。",
  "git.default.commitPushTo": "提交并推送到 {{branch}}",
  "git.default.pushTo": "推送到 {{branch}}",
  "git.default.commitCreate": "提交、推送并创建 {{shortLabel}}",
  "git.default.noFeature":
    "没有可提交的变更，因此无法为功能分支命名。请自行创建分支，或继续在 {{branch}} 上进行。",
} as const satisfies Record<keyof typeof gitFlowEn, string>;
