import type { TFunction } from "i18next";
import { sourceControlTerm } from "../i18n/sourceControlTerm.ts";
import type {
  GitRunStackedActionInput,
  GitStackedAction,
  VcsStatusResult,
} from "@t3tools/contracts";
import { type ChangeRequestTerminology, sourceControlClients } from "../sourceControlClients.ts";

export type GitActionIconName = "commit" | "push" | "pr";

export type GitDialogAction = "commit" | "push" | "create_pr";

export interface GitActionMenuItem {
  id: "commit" | "push" | "pr";
  label: string;
  disabled: boolean;
  icon: GitActionIconName;
  kind: "open_dialog" | "open_pr";
  dialogAction?: GitDialogAction;
}

export interface GitQuickAction {
  label: string;
  disabled: boolean;
  kind: "run_action" | "run_pull" | "open_pr" | "show_hint";
  action?: GitStackedAction;
  hint?: string;
}

export interface DefaultBranchActionDialogCopy {
  title: string;
  description: string;
  continueLabel: string;
}

export type DefaultBranchConfirmableAction =
  | "push"
  | "create_pr"
  | "commit_push"
  | "commit_push_pr";

export type GitActionRequestInput = Pick<
  GitRunStackedActionInput,
  "action" | "commitMessage" | "featureBranch" | "filePaths"
>;

export function changeRequestTerminologyFor(
  gitStatus: VcsStatusResult | null,
): ChangeRequestTerminology {
  return sourceControlClients.get(gitStatus?.sourceControlProvider?.kind).changeRequest;
}

export function buildMenuItems(
  gitStatus: VcsStatusResult | null,
  isBusy: boolean,
  hasOriginRemote = true,
  t?: TFunction,
): GitActionMenuItem[] {
  if (!gitStatus) return [];
  const terminology = changeRequestTerminologyFor(gitStatus);

  const hasBranch = gitStatus.refName !== null;
  const hasChanges = gitStatus.hasWorkingTreeChanges;
  const hasOpenPr = gitStatus.pr?.state === "open";
  const isBehind = gitStatus.behindCount > 0;
  const canPushWithoutUpstream = hasOriginRemote && !gitStatus.hasUpstream;
  const canCommit = !isBusy && hasChanges;
  const canPush =
    !isBusy &&
    hasBranch &&
    !hasChanges &&
    !isBehind &&
    gitStatus.aheadCount > 0 &&
    (gitStatus.hasUpstream || canPushWithoutUpstream);
  const canCreatePr =
    !isBusy &&
    hasBranch &&
    !hasOpenPr &&
    (gitStatus.aheadOfDefaultCount ?? gitStatus.aheadCount) > 0 &&
    !isBehind &&
    (gitStatus.hasUpstream || canPushWithoutUpstream);
  const canOpenPr = !isBusy && hasOpenPr;

  return [
    {
      id: "commit",
      label: t?.("git.labels.commit") ?? "Commit",
      disabled: !canCommit,
      icon: "commit",
      kind: "open_dialog",
      dialogAction: "commit",
    },
    {
      id: "push",
      label: t?.("git.labels.push") ?? "Push",
      disabled: !canPush,
      icon: "push",
      kind: "open_dialog",
      dialogAction: "push",
    },
    hasOpenPr
      ? {
          id: "pr",
          label:
            t?.("git.shared.view", { shortLabel: terminology.shortLabel }) ??
            `View ${terminology.shortLabel}`,
          disabled: !canOpenPr,
          icon: "pr",
          kind: "open_pr",
        }
      : {
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
  isDefaultBranch = false,
  hasOriginRemote = true,
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
  const isBehind = gitStatus.behindCount > 0;
  const isDiverged = isAhead && isBehind;
  const terminology = changeRequestTerminologyFor(gitStatus);

  if (!hasBranch) {
    return {
      label: t?.("git.labels.commit") ?? "Commit",
      disabled: true,
      kind: "show_hint",
      hint:
        t?.("git.shared.branchBeforeRequest", {
          request: sourceControlTerm(t, terminology.shortLabelWithArticle),
        }) ??
        `Create and checkout a branch before pushing or opening ${terminology.shortLabelWithArticle}.`,
    };
  }

  if (hasChanges) {
    if (isBehind || (!gitStatus.hasUpstream && !hasOriginRemote)) {
      return {
        label: t?.("git.labels.commit") ?? "Commit",
        disabled: false,
        kind: "run_action",
        action: "commit",
      };
    }
    if (hasOpenPr || isDefaultBranch) {
      return {
        label: t?.("git.labels.commitPush") ?? "Commit & push",
        disabled: false,
        kind: "run_action",
        action: "commit_push",
      };
    }
    return {
      label:
        t?.("git.shared.commitPushRequest", { shortLabel: terminology.shortLabel }) ??
        `Commit, push & ${terminology.shortLabel}`,
      disabled: false,
      kind: "run_action",
      action: "commit_push_pr",
    };
  }

  if (!gitStatus.hasUpstream) {
    if (!hasOriginRemote) {
      if (hasOpenPr && !isAhead) {
        return {
          label:
            t?.("git.shared.view", { shortLabel: terminology.shortLabel }) ??
            `View ${terminology.shortLabel}`,
          disabled: false,
          kind: "open_pr",
        };
      }
      return {
        label: t?.("git.labels.push") ?? "Push",
        disabled: true,
        kind: "show_hint",
        hint:
          t?.("git.shared.remoteBeforeRequest", {
            request: sourceControlTerm(t, terminology.shortLabelWithArticle),
          }) ??
          `Add an "origin" remote before pushing or creating ${terminology.shortLabelWithArticle}.`,
      };
    }
    if (!isAhead) {
      if (hasOpenPr) {
        return {
          label:
            t?.("git.shared.view", { shortLabel: terminology.shortLabel }) ??
            `View ${terminology.shortLabel}`,
          disabled: false,
          kind: "open_pr",
        };
      }
      return {
        label: t?.("git.labels.push") ?? "Push",
        disabled: true,
        kind: "show_hint",
        hint: t?.("git.unavailable.noCommitsPush") ?? "No local commits to push.",
      };
    }
    if (hasOpenPr || isDefaultBranch) {
      return {
        label: t?.("git.labels.push") ?? "Push",
        disabled: false,
        kind: "run_action",
        action: isDefaultBranch ? "commit_push" : "push",
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
      label: t?.("git.shared.sync") ?? "Sync branch",
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
    if (hasOpenPr || isDefaultBranch) {
      return {
        label: t?.("git.labels.push") ?? "Push",
        disabled: false,
        kind: "run_action",
        action: isDefaultBranch ? "commit_push" : "push",
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
      label:
        t?.("git.shared.view", { shortLabel: terminology.shortLabel }) ??
        `View ${terminology.shortLabel}`,
      disabled: false,
      kind: "open_pr",
    };
  }

  return {
    label: t?.("git.labels.commit") ?? "Commit",
    disabled: true,
    kind: "show_hint",
    hint: t?.("git.labels.upToDate") ?? "Branch is up to date. No action needed.",
  };
}

export function getGitActionDisabledReason(
  input: {
    item: GitActionMenuItem;
    gitStatus: VcsStatusResult | null;
    isBusy: boolean;
    hasOriginRemote: boolean;
  },
  t?: TFunction,
): string | null {
  const { item, gitStatus, isBusy, hasOriginRemote } = input;
  if (!item.disabled) return null;
  if (isBusy) return t?.("git.unavailable.busy") ?? "Git action in progress.";
  if (!gitStatus) return t?.("git.unavailable.status") ?? "Git status is unavailable.";

  const hasBranch = gitStatus.refName !== null;
  const hasChanges = gitStatus.hasWorkingTreeChanges;
  const hasOpenPr = gitStatus.pr?.state === "open";
  const isAhead = gitStatus.aheadCount > 0;
  const isBehind = gitStatus.behindCount > 0;
  const terminology = changeRequestTerminologyFor(gitStatus);

  if (item.id === "commit") {
    if (!hasChanges) {
      return t?.("git.unavailable.clean") ?? "Worktree is clean. Make changes before committing.";
    }
    return t?.("git.unavailable.commit") ?? "Commit is currently unavailable.";
  }

  if (item.id === "push") {
    if (!hasBranch) {
      return (
        t?.("git.unavailable.detachedPush") ?? "Detached HEAD: checkout a branch before pushing."
      );
    }
    if (hasChanges) {
      return t?.("git.unavailable.changesPush") ?? "Commit or stash local changes before pushing.";
    }
    if (isBehind) {
      return (
        t?.("git.unavailable.behindPush") ??
        "Branch is behind upstream. Pull/rebase before pushing."
      );
    }
    if (!gitStatus.hasUpstream && !hasOriginRemote) {
      return t?.("git.unavailable.remotePush") ?? 'Add an "origin" remote before pushing.';
    }
    if (!isAhead) {
      return t?.("git.unavailable.noCommitsPush") ?? "No local commits to push.";
    }
    return t?.("git.unavailable.push") ?? "Push is currently unavailable.";
  }

  if (hasOpenPr) {
    return (
      t?.("git.shared.viewUnavailable", { shortLabel: terminology.shortLabel }) ??
      `View ${terminology.shortLabel} is currently unavailable.`
    );
  }
  if (!hasBranch) {
    return (
      t?.("git.shared.detachedRequest", {
        request: sourceControlTerm(t, terminology.shortLabelWithArticle),
      }) ?? `Detached HEAD: checkout a branch before creating ${terminology.shortLabelWithArticle}.`
    );
  }
  if (!gitStatus.hasUpstream && !hasOriginRemote) {
    return (
      t?.("git.shared.remoteRequest", {
        request: sourceControlTerm(t, terminology.shortLabelWithArticle),
      }) ?? `Add an "origin" remote before creating ${terminology.shortLabelWithArticle}.`
    );
  }
  if ((gitStatus.aheadOfDefaultCount ?? gitStatus.aheadCount) <= 0) {
    return (
      t?.("git.shared.emptyRequest", {
        request: sourceControlTerm(t, terminology.shortLabelWithArticle),
      }) ?? `No local commits to include in ${terminology.shortLabelWithArticle}.`
    );
  }
  if (isBehind) {
    return (
      t?.("git.shared.behindRequest", {
        request: sourceControlTerm(t, terminology.shortLabelWithArticle),
      }) ??
      `Branch is behind upstream. Pull/rebase before creating ${terminology.shortLabelWithArticle}.`
    );
  }
  return (
    t?.("git.shared.createUnavailable", { shortLabel: terminology.shortLabel }) ??
    `Create ${terminology.shortLabel} is currently unavailable.`
  );
}

export function requiresDefaultBranchConfirmation(
  action: GitStackedAction,
  isDefaultBranch: boolean,
): boolean {
  if (!isDefaultBranch) return false;
  return (
    action === "push" ||
    action === "create_pr" ||
    action === "commit_push" ||
    action === "commit_push_pr"
  );
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
  const { shortLabel, shortLabelWithArticle } = input.terminology;
  if (t) {
    const values = {
      branch: branchLabel,
      shortLabel,
      request: sourceControlTerm(t, shortLabelWithArticle),
    };
    const pushOnly = input.action === "push" || input.action === "commit_push";
    return {
      title: t(
        pushOnly
          ? input.includesCommit
            ? "git.shared.defaultCommitPushTitle"
            : "git.shared.defaultPushTitle"
          : input.includesCommit
            ? "git.shared.defaultCommitCreateTitle"
            : "git.shared.defaultPushCreateTitle",
        values,
      ),
      description: t(
        pushOnly
          ? input.includesCommit
            ? "git.shared.defaultCommitPushDescription"
            : "git.shared.defaultPushDescription"
          : input.includesCommit
            ? "git.shared.defaultCommitCreateDescription"
            : "git.shared.defaultPushCreateDescription",
        values,
      ),
      continueLabel: t(
        pushOnly
          ? input.includesCommit
            ? "git.shared.commitPushTo"
            : "git.shared.pushTo"
          : input.includesCommit
            ? "git.shared.commitCreate"
            : "git.labels.pushCreate",
        values,
      ),
    };
  }
  const suffix = ` on "${branchLabel}". You can continue on this branch or create a feature branch and run the same action there.`;

  if (input.action === "push" || input.action === "commit_push") {
    if (input.includesCommit) {
      return {
        title: "Commit & push to default branch?",
        description: `This action will commit and push changes${suffix}`,
        continueLabel: `Commit & push to ${branchLabel}`,
      };
    }
    return {
      title: "Push to default branch?",
      description: `This action will push local commits${suffix}`,
      continueLabel: `Push to ${branchLabel}`,
    };
  }

  if (input.includesCommit) {
    return {
      title: `Commit, push & create ${shortLabel} from default branch?`,
      description: `This action will commit, push, and create ${shortLabelWithArticle}${suffix}`,
      continueLabel: `Commit, push & create ${shortLabel}`,
    };
  }
  return {
    title: `Push & create ${shortLabel} from default branch?`,
    description: `This action will push local commits and create ${shortLabelWithArticle}${suffix}`,
    continueLabel: `Push & create ${shortLabel}`,
  };
}
