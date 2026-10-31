import type { TFunction } from "i18next";
import type {
  GitRunStackedActionResult,
  GitStackedAction,
  VcsStatusResult,
} from "@t3tools/contracts";
import { isTemporaryWorktreeBranch } from "@t3tools/shared/git";
import type { ChangeRequestTerminology } from "@t3tools/client-runtime/source-control-clients";
import {
  changeRequestTerminologyFor,
  type DefaultBranchActionDialogCopy,
  type DefaultBranchConfirmableAction,
  type GitActionIconName,
  type GitDialogAction,
} from "@t3tools/client-runtime/state/vcs";

export {
  requiresDefaultBranchConfirmation,
  type DefaultBranchConfirmableAction,
  type GitActionIconName,
} from "@t3tools/client-runtime/state/vcs";

export interface GitActionMenuItem {
  id: "commit" | "push" | "pr";
  label: string;
  disabled: boolean;
  icon: GitActionIconName;
  kind: "open_dialog";
  dialogAction?: GitDialogAction;
}

export interface GitQuickAction {
  label: string;
  disabled: boolean;
  kind: "run_action" | "run_pull" | "open_publish" | "show_hint";
  action?: GitStackedAction;
  hint?: string;
}

export interface GitActionProgressPresentation {
  readonly status: string;
  readonly output: string | null;
  readonly startedAtMs: number | null;
}

export interface GitActionResultToastTiming {
  readonly timeout: 0;
  readonly dismissAfterVisibleMs: number | null;
}

export const GIT_ACTION_SUCCESS_VISIBLE_MS = 10_000;

export function resolveGitActionResultToastTiming(
  type: "error" | "success",
): GitActionResultToastTiming {
  return {
    timeout: 0,
    dismissAfterVisibleMs: type === "success" ? GIT_ACTION_SUCCESS_VISIBLE_MS : null,
  };
}

export function resolveGitActionProgressPresentation(
  input: {
    readonly isRunning: boolean;
    readonly operation: string | null;
    readonly currentLabel: string | null;
    readonly lastOutputLine: string | null;
    readonly phaseStartedAtMs: number | null;
    readonly hookStartedAtMs: number | null;
  },
  t?: TFunction,
): GitActionProgressPresentation | null {
  if (
    !input.isRunning ||
    (input.operation !== "run_change_request" && input.operation !== "pull")
  ) {
    return null;
  }

  const currentLabel = input.currentLabel?.trim();
  const output = input.lastOutputLine?.trim();
  const isPull = input.operation === "pull";
  return {
    status:
      currentLabel && currentLabel !== "Running source control action"
        ? currentLabel
        : isPull
          ? (t?.("git.labels.pulling") ?? "Pulling latest changes...")
          : (t?.("git.labels.starting") ?? "Starting source control action..."),
    output: !isPull && output ? output : null,
    startedAtMs: isPull
      ? input.phaseStartedAtMs
      : (input.hookStartedAtMs ?? input.phaseStartedAtMs),
  };
}

export function formatGitActionElapsed(startedAtMs: number | null, nowMs: number): string | null {
  if (startedAtMs === null) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1_000));
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`;
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function buildMenuItems(
  gitStatus: VcsStatusResult | null,
  isBusy: boolean,
  hasPrimaryRemote = true,
  t?: TFunction,
): GitActionMenuItem[] {
  if (!gitStatus) return [];
  const terminology = changeRequestTerminologyFor(gitStatus);

  const hasBranch = gitStatus.refName !== null;
  const hasChanges = gitStatus.hasWorkingTreeChanges;
  const hasOpenPr = gitStatus.pr?.state === "open";
  const isBehind = gitStatus.behindCount > 0;
  const hasDefaultBranchDelta = (gitStatus.aheadOfDefaultCount ?? gitStatus.aheadCount) > 0;
  const canPushWithoutUpstream = hasPrimaryRemote && !gitStatus.hasUpstream;
  const canCommit = !isBusy && hasChanges;
  const canPush =
    !isBusy &&
    hasBranch &&
    !isBehind &&
    gitStatus.aheadCount > 0 &&
    (gitStatus.hasUpstream || canPushWithoutUpstream);
  const canCreatePr =
    !isBusy &&
    hasBranch &&
    !hasOpenPr &&
    hasDefaultBranchDelta &&
    !isBehind &&
    (gitStatus.hasUpstream || canPushWithoutUpstream);

  const commitItem: GitActionMenuItem = {
    id: "commit",
    label: t?.("git.labels.commit") ?? "Commit",
    disabled: !canCommit,
    icon: "commit",
    kind: "open_dialog",
    dialogAction: "commit",
  };

  if (!hasPrimaryRemote) {
    return [commitItem];
  }

  const pushItem: GitActionMenuItem = {
    id: "push",
    label: t?.("git.labels.push") ?? "Push",
    disabled: !canPush,
    icon: "push",
    kind: "open_dialog",
    dialogAction: "push",
  };

  if (hasOpenPr) {
    return [commitItem, pushItem];
  }

  return [
    commitItem,
    pushItem,
    {
      id: "pr",
      label:
        t?.("git.labels.create", { shortLabel: terminology.shortLabel }) ??
        `Create ${terminology.shortLabel}`,
      disabled: !canCreatePr,
      icon: "pr",
      kind: "open_dialog",
      dialogAction: "create_pr",
    },
  ];
}

export function resolveQuickAction(
  gitStatus: VcsStatusResult | null,
  isBusy: boolean,
  isDefaultRef = false,
  hasPrimaryRemote = true,
  t?: TFunction,
): GitQuickAction {
  if (isBusy) {
    return {
      label: t?.("git.labels.commit") ?? "Commit",
      disabled: true,
      kind: "show_hint",
      hint: t?.("git.unavailable.busy") ?? "Git action in progress.",
    };
  }

  if (!gitStatus) {
    return {
      label: t?.("git.labels.commit") ?? "Commit",
      disabled: true,
      kind: "show_hint",
      hint: t?.("git.unavailable.status") ?? "Git status is unavailable.",
    };
  }

  const hasBranch = gitStatus.refName !== null;
  const hasChanges = gitStatus.hasWorkingTreeChanges;
  const hasOpenPr = gitStatus.pr?.state === "open";
  const isAhead = gitStatus.aheadCount > 0;
  const hasDefaultBranchDelta = (gitStatus.aheadOfDefaultCount ?? gitStatus.aheadCount) > 0;
  const isBehind = gitStatus.behindCount > 0;
  const isDiverged = isAhead && isBehind;
  const terminology = changeRequestTerminologyFor(gitStatus);

  if (!hasBranch) {
    return {
      label: t?.("git.labels.commit") ?? "Commit",
      disabled: true,
      kind: "show_hint",
      hint: `Create and checkout a ref before pushing or opening a ${terminology.singular}.`,
    };
  }

  if (hasChanges) {
    if (isBehind || (!gitStatus.hasUpstream && !hasPrimaryRemote)) {
      return {
        label: t?.("git.labels.commit") ?? "Commit",
        disabled: false,
        kind: "run_action",
        action: "commit",
      };
    }
    if (hasOpenPr || isDefaultRef) {
      return {
        label: t?.("git.labels.commitPush") ?? "Commit & push",
        disabled: false,
        kind: "run_action",
        action: "commit_push",
      };
    }
    return {
      label:
        t?.("git.labels.commitPushRequest", { shortLabel: terminology.shortLabel }) ??
        `Commit, push & ${terminology.shortLabel}`,
      disabled: false,
      kind: "run_action",
      action: "commit_push_pr",
    };
  }

  if (!gitStatus.hasUpstream) {
    if (!hasPrimaryRemote) {
      return {
        label: t?.("git.labels.publish") ?? "Publish repository",
        disabled: false,
        kind: "open_publish",
      };
    }
    if (!isAhead) {
      if (hasOpenPr) {
        return {
          label: t?.("git.labels.commit") ?? "Commit",
          disabled: true,
          kind: "show_hint",
          hint: t?.("git.labels.upToDate") ?? "Branch is up to date. No action needed.",
        };
      }
      return {
        label: t?.("git.labels.push") ?? "Push",
        disabled: true,
        kind: "show_hint",
        hint: t?.("git.unavailable.noCommitsPush") ?? "No local commits to push.",
      };
    }
    if (hasOpenPr || isDefaultRef) {
      return {
        label: t?.("git.labels.push") ?? "Push",
        disabled: false,
        kind: "run_action",
        action: isDefaultRef ? "commit_push" : "push",
      };
    }
    return {
      label:
        t?.("git.labels.pushCreate", { shortLabel: terminology.shortLabel }) ??
        `Push & create ${terminology.shortLabel}`,
      disabled: false,
      kind: "run_action",
      action: "create_pr",
    };
  }

  if (isDiverged) {
    return {
      label: t?.("git.labels.sync") ?? "Sync ref",
      disabled: true,
      kind: "show_hint",
      hint: t?.("git.labels.diverged") ?? "Branch has diverged from upstream. Rebase/merge first.",
    };
  }

  if (isBehind) {
    return {
      label: t?.("git.labels.pull") ?? "Pull",
      disabled: false,
      kind: "run_pull",
    };
  }

  if (isAhead) {
    if (hasOpenPr || isDefaultRef) {
      return {
        label: t?.("git.labels.push") ?? "Push",
        disabled: false,
        kind: "run_action",
        action: isDefaultRef ? "commit_push" : "push",
      };
    }
    return {
      label:
        t?.("git.labels.pushCreate", { shortLabel: terminology.shortLabel }) ??
        `Push & create ${terminology.shortLabel}`,
      disabled: false,
      kind: "run_action",
      action: "create_pr",
    };
  }

  if (hasOpenPr && gitStatus.hasUpstream) {
    return {
      label: t?.("git.labels.commit") ?? "Commit",
      disabled: true,
      kind: "show_hint",
      hint: t?.("git.labels.upToDate") ?? "Branch is up to date. No action needed.",
    };
  }

  if (hasDefaultBranchDelta && !isDefaultRef) {
    return {
      label:
        t?.("git.labels.create", { shortLabel: terminology.shortLabel }) ??
        `Create ${terminology.shortLabel}`,
      disabled: false,
      kind: "run_action",
      action: "create_pr",
    };
  }

  return {
    label: t?.("git.labels.commit") ?? "Commit",
    disabled: true,
    kind: "show_hint",
    hint: t?.("git.labels.upToDate") ?? "Branch is up to date. No action needed.",
  };
}

export function resolveDefaultBranchActionDialogCopy(
  input: {
    action: DefaultBranchConfirmableAction;
    branchName: string;
    includesCommit: boolean;
    terminology: ChangeRequestTerminology;
  },
  t?: TFunction,
): DefaultBranchActionDialogCopy {
  const branchLabel = input.branchName;
  const suffix = ` on "${branchLabel}". You can continue on this ref or create a feature ref and run the same action there.`;
  const { terminology } = input;
  const params = {
    branch: branchLabel,
    shortLabel: terminology.shortLabel,
    kind:
      t && terminology.shortLabel === "PR"
        ? t("sourceControl.terms.pullRequest")
        : t && terminology.shortLabel === "MR"
          ? t("sourceControl.terms.mergeRequest")
          : terminology.singular,
  };

  if (input.action === "push" || input.action === "commit_push") {
    if (input.includesCommit) {
      return {
        title: t?.("git.default.commitPushTitle", params) ?? "Commit & push to default ref?",
        description:
          t?.("git.default.commitPushDescription", params) ??
          `This action will commit and push changes${suffix}`,
        continueLabel: t?.("git.default.commitPushTo", params) ?? `Commit & push to ${branchLabel}`,
      };
    }
    return {
      title: t?.("git.default.pushTitle", params) ?? "Push to default ref?",
      description:
        t?.("git.default.pushDescription", params) ??
        `This action will push local commits${suffix}`,
      continueLabel: t?.("git.default.pushTo", params) ?? `Push to ${branchLabel}`,
    };
  }

  if (input.includesCommit) {
    return {
      title:
        t?.("git.default.commitCreateTitle", params) ??
        `Commit, push & create ${terminology.shortLabel} from default ref?`,
      description:
        t?.("git.default.commitCreateDescription", params) ??
        `This action will commit, push, and create a ${terminology.singular}${suffix}`,
      continueLabel:
        t?.("git.default.commitCreate", params) ??
        `Commit, push & create ${terminology.shortLabel}`,
    };
  }
  return {
    title:
      t?.("git.default.pushCreateTitle", params) ??
      `Push & create ${terminology.shortLabel} from default ref?`,
    description:
      t?.("git.default.pushCreateDescription", params) ??
      `This action will push local commits and create a ${terminology.singular}${suffix}`,
    continueLabel:
      t?.("git.labels.pushCreate", params) ?? `Push & create ${terminology.shortLabel}`,
  };
}

/** Clean trees cannot create feature branches because the server derives names from uncommitted changes. */
export function resolveFeatureBranchUnavailableReason(
  input: {
    branchName: string;
    hasWorkingTreeChanges: boolean;
  },
  t?: TFunction,
): string | null {
  if (input.hasWorkingTreeChanges) return null;
  return (
    t?.("git.default.noFeature", { branch: input.branchName }) ??
    `There are no changes to commit, so a feature branch can't be named. Create a branch yourself or continue on ${input.branchName}.`
  );
}

export function resolveThreadBranchUpdate(
  result: GitRunStackedActionResult,
): { branch: string } | null {
  if (result.branch.status !== "created" || !result.branch.name) {
    return null;
  }

  return {
    branch: result.branch.name,
  };
}

export function resolveThreadBranchMetadataPatch(
  branch: string | null,
  expectedBranch: string | null,
): {
  branch: string | null;
  expectedBranch: string | null;
} {
  return { branch, expectedBranch };
}

export function resolveLiveThreadBranchUpdate(input: {
  threadBranch: string | null;
  gitStatus: VcsStatusResult | null;
}): { branch: string | null } | null {
  if (!input.gitStatus) {
    return null;
  }

  if (input.gitStatus.refName === null && input.threadBranch !== null) {
    return null;
  }

  if (input.threadBranch === input.gitStatus.refName) {
    return null;
  }

  if (
    input.threadBranch !== null &&
    input.gitStatus.refName !== null &&
    !isTemporaryWorktreeBranch(input.threadBranch) &&
    isTemporaryWorktreeBranch(input.gitStatus.refName)
  ) {
    return null;
  }

  return {
    branch: input.gitStatus.refName,
  };
}
