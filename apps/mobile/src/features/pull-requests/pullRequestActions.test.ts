import { createI18n } from "@t3tools/client-runtime/i18n";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import { describe, expect, it } from "vite-plus/test";
import {
  allowedMergeMethods,
  canPerformPullRequestAction,
  mergeUnavailableReason,
  mergeUnavailableCode,
  pullRequestActionLabel,
} from "./pullRequestActions";

const GITHUB = sourceControlClients.get("github").changeRequest;
const GITLAB = sourceControlClients.get("gitlab").changeRequest;

import type { PullRequestAction } from "@t3tools/contracts";

const ALL_PR_ACTIONS: readonly PullRequestAction[] = [
  "merge",
  "ready",
  "draft",
  "update-branch",
  "enable-auto-merge",
  "disable-auto-merge",
  "approve-workflows",
  "close",
  "reopen",
  "revert",
  "delete-branch",
];

type Detail = Parameters<typeof allowedMergeMethods>[0];

function detail(overrides: Partial<Detail> = {}): Detail {
  return {
    state: "open",
    isDraft: false,
    mergeability: "mergeable",
    autoMergeEnabled: false,
    capabilities: {
      actions: ALL_PR_ACTIONS,
      mergeMethods: ["merge", "squash", "rebase"],
      updateMethods: ["merge", "rebase"],
    },
    viewerPermissions: { actions: ALL_PR_ACTIONS, updateMethods: ["merge"] },
    mergeCapabilities: { merge: true, squash: true, rebase: false },
    ...overrides,
  };
}

describe("mobile pull request actions", () => {
  it("requires both provider support and account permission", () => {
    expect(
      canPerformPullRequestAction(detail({ viewerPermissions: { actions: [] } }), "merge"),
    ).toBe(false);
    expect(
      canPerformPullRequestAction(
        detail({ capabilities: { actions: [], mergeMethods: ["merge"] } }),
        "merge",
      ),
    ).toBe(false);
    expect(mergeUnavailableReason(detail(), false, GITHUB)).toContain("read-only");
  });

  it("blocks a conflicting PR's immediate merge and explains why", () => {
    const pr = detail({ mergeability: "conflicting" });
    expect(canPerformPullRequestAction(pr, "merge")).toBe(false);
    expect(mergeUnavailableReason(pr, true, GITHUB)).toContain("conflicts");
    expect(mergeUnavailableCode(pr, true)).toBe("conflicts");
    expect(mergeUnavailableCode(pr, false)).toBe("readOnly");
    const t = createI18n("zh-CN").t;
    expect(mergeUnavailableReason(pr, true, GITHUB, t)).toBe(t("pr.merge.conflicts"));
    expect(mergeUnavailableReason(pr, false, GITHUB, t)).toBe(t("pr.merge.readOnly"));
  });

  it("names the change request with its host's term", () => {
    expect(pullRequestActionLabel("close", GITHUB)).toBe("Close pull request");
    expect(pullRequestActionLabel("close", GITLAB)).toBe("Close merge request");
    expect(pullRequestActionLabel("revert", GITLAB)).toBe("Create revert merge request");
    const t = createI18n("zh-CN").t;
    expect(pullRequestActionLabel("close", GITHUB, t)).toBe("关闭拉取请求");
    expect(pullRequestActionLabel("close", GITLAB, t)).toBe("关闭合并请求");

    expect(mergeUnavailableReason(detail({ state: "merged" }), true, GITLAB)).toBe(
      "This merge request has been merged.",
    );
  });
});
