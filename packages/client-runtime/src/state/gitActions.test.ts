import { createI18n } from "../i18n/index.ts";
import { SourceControlProviderKind, type VcsStatusResult } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { sourceControlClients } from "../sourceControlClients.ts";
import {
  buildMenuItems,
  getGitActionDisabledReason,
  resolveDefaultBranchActionDialogCopy,
  resolveQuickAction,
} from "./gitActions.ts";

function status(overrides: Partial<VcsStatusResult> = {}): VcsStatusResult {
  return {
    isRepo: true,
    hasPrimaryRemote: true,
    isDefaultRef: false,
    refName: "feature/test",
    hasWorkingTreeChanges: false,
    workingTree: { files: [], insertions: 0, deletions: 0 },
    hasUpstream: true,
    aheadCount: 0,
    behindCount: 0,
    pr: null,
    ...overrides,
  };
}

const gitLab = {
  sourceControlProvider: {
    kind: SourceControlProviderKind.make("gitlab"),
    name: "GitLab",
    baseUrl: "https://gitlab.com",
  },
};

const openPr = {
  number: 7,
  title: "Feature",
  url: "https://example.com/pr/7",
  baseRef: "main",
  headRef: "feature/test",
  state: "open" as const,
};

describe("git action copy", () => {
  it("says PR for a GitHub ref", () => {
    expect(resolveQuickAction(status({ aheadCount: 1 }), false).label).toBe("Push & create PR");
    expect(resolveQuickAction(status({ pr: openPr }), false).label).toBe("View PR");
    const [, , prItem] = buildMenuItems(status(), false);
    expect(prItem?.label).toBe("Create PR");
    expect(
      getGitActionDisabledReason({
        item: prItem!,
        gitStatus: status(),
        isBusy: false,
        hasOriginRemote: true,
      }),
    ).toBe("No local commits to include in a PR.");
  });

  it("says MR for a GitLab ref", () => {
    expect(resolveQuickAction(status({ ...gitLab, aheadCount: 1 }), false).label).toBe(
      "Push & create MR",
    );
    expect(
      resolveQuickAction(status({ ...gitLab, hasWorkingTreeChanges: true }), false).label,
    ).toBe("Commit, push & MR");
    expect(resolveQuickAction(status({ ...gitLab, pr: openPr }), false).label).toBe("View MR");
    const [, , prItem] = buildMenuItems(status(gitLab), false);
    expect(prItem?.label).toBe("Create MR");
    expect(
      getGitActionDisabledReason({
        item: prItem!,
        gitStatus: status(gitLab),
        isBusy: false,
        hasOriginRemote: true,
      }),
    ).toBe("No local commits to include in an MR.");
    const t = createI18n("zh-CN").t;
    for (const current of [
      status({ ...gitLab, aheadCount: 1 }),
      status({ ...gitLab, behindCount: 1 }),
      status({ ...gitLab, hasWorkingTreeChanges: true }),
      status({ ...gitLab, aheadCount: 1, behindCount: 1 }),
    ]) {
      const original = resolveQuickAction(current, false);
      const translated = resolveQuickAction(current, false, false, true, t);
      expect({
        kind: translated.kind,
        action: translated.action,
        disabled: translated.disabled,
      }).toEqual({ kind: original.kind, action: original.action, disabled: original.disabled });
    }
    expect(resolveQuickAction(status({ ...gitLab, pr: openPr }), false, false, true, t).label).toBe(
      "查看 MR",
    );
  });

  it("names the host's change request in the default-branch dialog", () => {
    const input = { action: "commit_push_pr", branchName: "main", includesCommit: true } as const;
    expect(
      resolveDefaultBranchActionDialogCopy({
        ...input,
        terminology: sourceControlClients.get("github").changeRequest,
      }).title,
    ).toBe("Commit, push & create PR from default branch?");
    expect(
      resolveDefaultBranchActionDialogCopy({
        ...input,
        terminology: sourceControlClients.get("gitlab").changeRequest,
      }).continueLabel,
    ).toBe("Commit, push & create MR");
    const translated = resolveDefaultBranchActionDialogCopy(
      {
        ...input,
        branchName: "Main/{{raw}}",
        terminology: sourceControlClients.get("gitlab").changeRequest,
      },
      createI18n("zh-CN").t,
    );
    expect(translated.description).toContain("Main/{{raw}}");
    expect(translated.description).toContain("一个 MR");
    expect(translated.continueLabel).toBe("提交、推送并创建 MR");
  });
});
