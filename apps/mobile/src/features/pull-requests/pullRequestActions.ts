import type { TFunction } from "i18next";
import { sourceControlTerm } from "@t3tools/client-runtime/i18n";
import {
  sourceControlClients,
  type ChangeRequestTerminology,
} from "@t3tools/client-runtime/source-control-clients";
import type {
  PullRequestAction,
  PullRequestDetail,
  PullRequestMergeMethod,
  SourceControlProviderKind,
} from "@t3tools/contracts";
import type { AppSymbolName } from "../../components/ui/AppSymbol";
import { PullRequestGlyph } from "./pullRequestGlyphs";

type ActionDetail = Pick<
  PullRequestDetail,
  "state" | "isDraft" | "mergeability" | "autoMergeEnabled" | "workflowApprovalsRequired"
> & {
  readonly capabilities: Pick<
    PullRequestDetail["capabilities"],
    "actions" | "mergeMethods" | "updateMethods" | "deleteBranch"
  >;
  readonly viewerPermissions: Pick<
    PullRequestDetail["viewerPermissions"],
    "actions" | "updateMethods"
  >;
  readonly mergeCapabilities: PullRequestDetail["mergeCapabilities"];
};

const MERGE_METHODS = {
  squash: { title: "Squash and merge", description: "Combine the commits into one commit." },
  merge: {
    title: "Create a merge commit",
    description: "Keep the commits and add a merge commit.",
  },
  rebase: { title: "Rebase and merge", description: "Add the commits without a merge commit." },
} as const satisfies Record<PullRequestMergeMethod, { title: string; description: string }>;

export function mergeMethodPresentation(method: PullRequestMergeMethod, t?: TFunction) {
  return t
    ? { title: t(`pr.method.${method}`), description: t(`pr.method.${method}Hint`) }
    : MERGE_METHODS[method];
}

const ACTION_LABEL_KEYS = {
  merge: "pr.action.merge",
  ready: "pr.action.ready",
  draft: "pr.action.draft",
  close: "pr.action.close",
  reopen: "pr.action.reopen",
  "update-branch": "pr.action.updateBranch",
  "enable-auto-merge": "pr.action.enableAuto",
  "disable-auto-merge": "pr.action.disableAuto",
  revert: "pr.action.revert",
  "delete-branch": "pr.action.deleteBranch",
  "approve-workflows": "pr.action.approveWorkflows",
} as const satisfies Record<PullRequestAction, string>;

export function pullRequestActionLabel(
  action: PullRequestAction,
  terminology: ChangeRequestTerminology,
  t?: TFunction,
): string {
  if (t) return t(ACTION_LABEL_KEYS[action], { kind: sourceControlTerm(t, terminology.singular) });
  switch (action) {
    case "merge":
      return `Merge ${terminology.singular}`;
    case "ready":
      return "Mark ready for review";
    case "draft":
      return "Convert to draft";
    case "close":
      return `Close ${terminology.singular}`;
    case "reopen":
      return `Reopen ${terminology.singular}`;
    case "update-branch":
      return "Update branch";
    case "enable-auto-merge":
      return "Enable auto-merge";
    case "disable-auto-merge":
      return "Disable auto-merge";
    case "revert":
      return `Create revert ${terminology.singular}`;
    case "delete-branch":
      return "Delete branch";
    case "approve-workflows":
      return "Approve workflows";
  }
}

export const PR_ACTION_ICONS = {
  merge: PullRequestGlyph.merged,
  ready: "checkmark.circle",
  draft: "pencil",
  close: "xmark",
  reopen: "arrow.clockwise",
  "update-branch": "arrow.up.circle",
  "enable-auto-merge": "clock",
  "disable-auto-merge": "xmark",
  revert: "arrow.uturn.backward",
  "delete-branch": "trash",
  "approve-workflows": "checkmark",
} as const satisfies Record<PullRequestAction, AppSymbolName>;

export function allowedMergeMethods(pr: ActionDetail) {
  return pr.capabilities.mergeMethods.filter((method) => pr.mergeCapabilities[method]);
}

export function allowedUpdateMethods(pr: ActionDetail) {
  return (pr.capabilities.updateMethods ?? []).filter((method) =>
    pr.viewerPermissions.updateMethods?.includes(method),
  );
}

export function canPerformPullRequestAction(pr: ActionDetail, action: PullRequestAction) {
  if (!pr.capabilities.actions.includes(action) || !pr.viewerPermissions.actions.includes(action))
    return false;
  if (action === "reopen") return pr.state === "closed";
  if (action === "revert") return pr.state === "merged";
  if (action === "delete-branch")
    return pr.state !== "open" && pr.capabilities.deleteBranch === true;
  if (pr.state !== "open") return false;
  switch (action) {
    case "update-branch":
      return allowedUpdateMethods(pr).length > 0;
    case "approve-workflows":
      return (pr.workflowApprovalsRequired ?? 0) > 0;
    case "ready":
      return pr.isDraft;
    case "draft":
      return !pr.isDraft;
    case "merge":
      return !pr.isDraft && pr.mergeability !== "conflicting" && allowedMergeMethods(pr).length > 0;
    case "enable-auto-merge":
      return !pr.isDraft && pr.autoMergeEnabled === false && allowedMergeMethods(pr).length > 0;
    case "disable-auto-merge":
      return pr.autoMergeEnabled === true;
    default:
      return true;
  }
}

export function mergeUnavailableCode(pr: ActionDetail, connectionAllowsWrites: boolean) {
  if (pr.state === "merged") return "merged";
  if (pr.state === "closed") return "closed";
  if (!connectionAllowsWrites) return "readOnly";
  if (!pr.capabilities.actions.includes("merge")) return "unsupported";
  if (!pr.viewerPermissions.actions.includes("merge")) return "noPermission";
  if (pr.isDraft) return "draft";
  if (pr.mergeability === "conflicting") return "conflicts";
  if (!allowedMergeMethods(pr).length) return "noMethods";
  return null;
}

export function mergeUnavailableReason(
  pr: ActionDetail,
  connectionAllowsWrites: boolean,
  terminology: ChangeRequestTerminology,
  t?: TFunction,
) {
  const code = mergeUnavailableCode(pr, connectionAllowsWrites);
  if (code === null) return null;
  if (t) return t(`pr.merge.${code}`, { kind: sourceControlTerm(t, terminology.singular) });
  switch (code) {
    case "merged":
      return `This ${terminology.singular} has been merged.`;
    case "closed":
      return `Reopen this ${terminology.singular} before merging.`;
    case "readOnly":
      return "This environment connection is read-only.";
    case "unsupported":
      return "This provider does not support merging here.";
    case "noPermission":
      return `Your account cannot merge this ${terminology.singular}.`;
    case "draft":
      return "Mark this draft ready for review before merging.";
    case "conflicts":
      return "Resolve the branch conflicts before merging.";
    case "noMethods":
      return "This repository has no available merge methods.";
  }
}

export const openOnProviderLabel = (provider: SourceControlProviderKind, t?: TFunction) =>
  t?.("pr.action.openProvider", { provider: sourceControlClients.get(provider).label }) ??
  `Open on ${sourceControlClients.get(provider).label}`;
