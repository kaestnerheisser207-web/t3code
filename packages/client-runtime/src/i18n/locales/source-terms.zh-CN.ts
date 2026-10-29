import type { sourceTermsEn } from "./source-terms.en.ts";
export const sourceTermsZhCN = {
  "sourceControl.terms.pullRequest": "拉取请求",
  "sourceControl.terms.pullRequests": "拉取请求",
  "sourceControl.terms.aPr": "一个 PR",
  "sourceControl.terms.mergeRequest": "合并请求",
  "sourceControl.terms.mergeRequests": "合并请求",
  "sourceControl.terms.anMr": "一个 MR",
} as const satisfies Record<keyof typeof sourceTermsEn, string>;
