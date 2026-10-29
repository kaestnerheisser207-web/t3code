import type { countSentencesEn } from "./count-sentences.en.ts";
export const countSentencesZhCN = {
  "counts.changedFiles_one": "{{count}} 个已更改文件",
  "counts.changedFiles_other": "{{count}} 个已更改文件",
  "stash.savingImages_one": "正在保存 {{count}} 张图片…",
  "stash.savingImages_other": "正在保存 {{count}} 张图片…",
  "stash.droppedImages_one": "{{count}} 张图片未保留",
  "stash.droppedImages_other": "{{count}} 张图片未保留",
  "counts.archiveEntries_one": "{{formattedCount}} 个条目",
  "counts.archiveEntries_other": "{{formattedCount}} 个条目",
  "prompt.hiddenCharacters_one": "T3 Code 已移除 {{count}} 个隐藏字符。发送前请先阅读提示词。",
  "prompt.hiddenCharacters_other": "T3 Code 已移除 {{count}} 个隐藏字符。发送前请先阅读提示词。",
  "pr.olderConversations_one": "显示 {{count}} 个较早的讨论（{{hidden}} 个已隐藏）",
  "pr.olderConversations_other": "显示 {{count}} 个较早的讨论（{{hidden}} 个已隐藏）",
  "pr.partialComments_one":
    "此讨论仅加载了一部分。已加载 {{count}} 条评论；请在托管平台上打开以阅读其余内容。",
  "pr.partialComments_other":
    "此讨论仅加载了一部分。已加载 {{count}} 条评论；请在托管平台上打开以阅读其余内容。",
  "counts.models_one": "{{count}} 个模型",
  "counts.models_other": "{{count}} 个模型",
  "counts.emptyPlaceholders_one": "{{count}} 个空占位符",
  "counts.emptyPlaceholders_other": "{{count}} 个空占位符",
  "counts.questions_one": "{{count}} 个问题",
  "counts.questions_other": "{{count}} 个问题",
  "counts.comments_one": "{{count}} 条评论",
  "counts.comments_other": "{{count}} 条评论",
} as const satisfies Record<keyof typeof countSentencesEn, string>;
