import type { TFunction } from "i18next";

const keys = {
  "pull request": "sourceControl.terms.pullRequest",
  "pull requests": "sourceControl.terms.pullRequests",
  "merge request": "sourceControl.terms.mergeRequest",
  "merge requests": "sourceControl.terms.mergeRequests",
  "a PR": "sourceControl.terms.aPr",
  "an MR": "sourceControl.terms.anMr",
} as const;

export function sourceControlTerm(t: TFunction, value: string): string {
  return Object.hasOwn(keys, value) ? t(keys[value as keyof typeof keys]) : value;
}
