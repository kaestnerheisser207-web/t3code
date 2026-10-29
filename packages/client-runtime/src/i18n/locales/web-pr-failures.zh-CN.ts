export const webPrFailuresZhCN = {
  "web.pr.failure.merge": "无法合并此{{kind}}",
  "web.pr.failure.ready": "无法将此项标记为可供审查",
  "web.pr.failure.draft": "无法将此项转换为草稿",
  "web.pr.failure.close": "无法关闭此{{kind}}",
  "web.pr.failure.reopen": "无法重新打开此{{kind}}",
  "web.pr.failure.update-branch": "无法更新此分支",
  "web.pr.failure.enable-auto-merge": "无法开启自动合并",
  "web.pr.failure.disable-auto-merge": "无法关闭自动合并",
  "web.pr.failure.revert": "无法创建还原{{kind}}",
  "web.pr.failure.delete-branch": "无法删除此分支",
  "web.pr.failure.approve-workflows": "无法批准工作流",
  "web.pr.hint.merge":
    "托管平台拒绝了合并操作。请确认你拥有写入权限、平台要求的检查已通过，并且该分支没有冲突。",
  "web.pr.hint.ready": "托管平台拒绝了该操作。请确认你对此仓库拥有写入权限。",
  "web.pr.hint.draft": "托管平台拒绝了该操作。请确认你对此仓库拥有写入权限。",
  "web.pr.hint.close": "托管平台拒绝了该操作。请确认你拥有写入权限，或者由你发起。",
  "web.pr.hint.reopen": "托管平台拒绝了该操作。请确认你拥有写入权限，并且该分支仍然存在。",
  "web.pr.hint.update-branch":
    "托管平台拒绝了该操作。请确认你对该分支拥有写入权限（若为复刻仓库的分支，还需要其作者允许维护者编辑），并且该分支与基础分支没有冲突。",
  "web.pr.hint.enable-auto-merge":
    "托管平台拒绝了该操作。请确认此仓库允许自动合并、你拥有写入权限，并且仍有需要等待的事项。",
  "web.pr.hint.disable-auto-merge":
    "托管平台拒绝了该操作。请确认你拥有写入权限，并且尚未发生合并。",
  "web.pr.hint.revert":
    "托管平台拒绝了该操作。请确认你拥有写入权限，并且此{{kind}}已在托管平台上合并。",
  "web.pr.hint.delete-branch":
    "托管平台拒绝了该操作。请确认你对源仓库拥有写入权限，并且该分支自本页加载以来未被改动。",
  "web.pr.hint.approve-workflows":
    "托管平台拒绝了该操作。请确认你拥有 Actions 写入权限，并且这些工作流运行仍在等待批准。",
  "web.pr.rebaseFailure":
    "托管平台拒绝了该操作。变基会在第一个无法干净应用的提交处停止；改用合并提交更新可能仍然可行。",
  "web.pr.tab.summary": "概要",
  "web.pr.tab.guide": "审查指南",
  "web.pr.tab.timeline": "时间线",
  "web.pr.tab.code": "代码",
} as const;
