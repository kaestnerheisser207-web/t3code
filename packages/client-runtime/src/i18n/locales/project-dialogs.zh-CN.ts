import type { projectDialogsEn } from "./project-dialogs.en.ts";
export const projectDialogsZhCN = {
  "mobile.project.an-error-occurred": "发生错误。",
  "mobile.project.git-url": "Git URL",
  "mobile.project.clone-from-a-remote-url": "从远程 URL 克隆",
  "mobile.project.browse-a-folder-on-disk": "浏览磁盘上的文件夹",
  "mobile.project.this-connection-cannot-add-projects": "此连接无法添加项目。",
  "mobile.project.this-connection-cannot-clone-projects": "此连接无法克隆项目。",
  "mobile.project.project-not-added": "项目未添加",
  "mobile.project.project-already-exists": "项目已存在",
  "mobile.project.project-added": "项目已添加",
  "mobile.project.the-project-was-created-but-has-not-reached-this-device-yet-it-will-appear-in-the-project-list-once-the-connection-catches-up":
    "项目已创建，但尚未同步到本设备。待连接完成同步后，它将出现在项目列表中。",
  "mobile.project.lookup-repository": "查找代码仓库",
  "mobile.project.this-connection-cannot-browse-host-folders": "此连接无法浏览主机文件夹。",
  "mobile.project.created-without-a-first-commit": "已创建，但没有首个提交",
} as const satisfies Record<keyof typeof projectDialogsEn, string>;
