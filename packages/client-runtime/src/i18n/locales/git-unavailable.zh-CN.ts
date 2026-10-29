import type { gitUnavailableEn } from "./git-unavailable.en.ts";
export const gitUnavailableZhCN = {
  "git.unavailable.busy": "Git 操作正在进行中。",
  "git.unavailable.status": "Git 状态不可用。",
  "git.unavailable.clean": "工作树没有更改。请先做出更改再提交。",
  "git.unavailable.commit": "当前无法提交。",
  "git.unavailable.detachedPush": "处于分离 HEAD：请先检出一个分支再推送。",
  "git.unavailable.changesPush": "请先提交本地更改或将其存入 stash，再推送。",
  "git.unavailable.behindPush": "分支落后于上游。请先拉取或变基，再推送。",
  "git.unavailable.remotePush": '请先添加 "origin" 远程仓库，再推送。',
  "git.unavailable.noCommitsPush": "没有可推送的本地提交。",
  "git.unavailable.push": "当前无法推送。",
  "git.unavailable.detachedRequest": "处于分离 HEAD：请先检出一个分支再创建{{kind}}。",
  "git.unavailable.remoteRequest": '请先添加 "origin" 远程仓库，再创建{{kind}}。',
  "git.unavailable.noCommitsRequest": "没有可包含在{{kind}}中的本地提交。",
  "git.unavailable.behindRequest": "分支落后于上游。请先拉取或变基，再创建{{kind}}。",
  "git.unavailable.request": "当前无法创建{{kind}}。",
} as const satisfies Record<keyof typeof gitUnavailableEn, string>;
