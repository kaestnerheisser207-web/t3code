import type { TFunction } from "i18next";
import { sourceControlTerm } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../i18n";
import { Toolbar } from "../../components/ui/Toolbar";
import * as Dialog from "../../components/ui/Dialog";
import { useOpenPullRequest } from "../../native/useOpenPullRequest";
import { createNativeHeaderMenu } from "../../components/ui/nativeHeaderMenu.ios";
import type { AppBarMenu } from "../../components/ui/AppBar.types";
import {
  AuthSourceControlWriteScope,
  EnvironmentId,
  type GitRunStackedActionResult,
  type ProjectScript,
  ThreadId,
  type VcsStatusResult,
} from "@t3tools/contracts";
import {
  type GitActionRequestInput,
  requiresDefaultBranchConfirmation,
  resolveQuickAction,
} from "@t3tools/client-runtime/state/vcs";
import { useNavigation } from "@react-navigation/native";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";

import { useEnvironmentScope } from "../../state/session";
import { PullRequestGlyph } from "../pull-requests/pullRequestGlyphs";
import {
  basename,
  getTerminalStatusLabel,
  projectScriptMenuIcon,
  type TerminalMenuSession,
} from "../terminal/terminalMenu";
import { projectScriptMenuLabel } from "@t3tools/shared/projectScripts";

function truncateMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const headLength = Math.ceil((maxLength - 1) / 2);
  const tailLength = Math.floor((maxLength - 1) / 2);
  return `${value.slice(0, headLength)}…${value.slice(value.length - tailLength)}`;
}

function compactMenuBranchLabel(branch: string): string {
  return truncateMiddle(branch, 24);
}

function compactMenuStatus(gitStatus: VcsStatusResult | null, t: TFunction): string {
  if (!gitStatus) {
    return t("mobile.git.checking");
  }
  if (!gitStatus.isRepo) {
    return t("mobile.git.notRepo");
  }

  const parts: string[] = [];
  if (gitStatus.hasWorkingTreeChanges) {
    parts.push(t("git.shared.changed", { count: gitStatus.workingTree.files.length }));
  } else if (gitStatus.aheadCount === 0 && gitStatus.behindCount === 0) {
    parts.push(t("mobile.git.clean"));
  }
  if (gitStatus.aheadCount > 0) {
    parts.push(t("git.shared.ahead", { count: gitStatus.aheadCount }));
  }
  if (gitStatus.behindCount > 0) {
    parts.push(t("git.shared.behind", { count: gitStatus.behindCount }));
  }
  if (gitStatus.pr?.state === "open") {
    const { shortLabel } = sourceControlClients.get(
      gitStatus.sourceControlProvider?.kind,
    ).changeRequest;
    parts.push(`${shortLabel} #${gitStatus.pr.number}`);
  }

  return parts.join(" · ");
}

type HeaderItem = Record<string, unknown>;
type HeaderItems = HeaderItem[];
type ThreadGitHeaderActionItems = {
  readonly terminal: HeaderItem;
  readonly files: HeaderItem;
  readonly git: HeaderItem;
};
type QuickActionIcon =
  | "arrow.down.circle"
  | "arrow.up.right.circle"
  | "checkmark.circle"
  | "arrow.up.circle";

export type ThreadGitMenuProps = {
  readonly environmentId: EnvironmentId | string;
  readonly threadId: ThreadId | string;
  readonly currentBranch: string | null;
  readonly hasThread?: boolean;
  readonly gitStatus: VcsStatusResult | null;
  readonly gitOperationLabel: string | null;
  readonly onOpenFilesInspector?: () => void;
  readonly onOpenGitInspector?: () => void;
  readonly onMergeBack?: () => void;
  readonly onPull: () => Promise<void>;
  readonly onRunAction: (input: GitActionRequestInput) => Promise<GitRunStackedActionResult | null>;
};

type ThreadGitControlsProps = ThreadGitMenuProps & {
  readonly auxiliaryPaneControl?: {
    readonly accessibilityLabel: string;
    readonly onPress: () => void;
  };
  readonly canOpenTerminal: boolean;
  readonly canOperateTerminal: boolean;
  readonly canOpenFiles: boolean;
  readonly projectScripts: ReadonlyArray<ProjectScript>;
  readonly terminalSessions: ReadonlyArray<TerminalMenuSession>;
  readonly showActionControls?: boolean;
  readonly showDirectFileControl?: boolean;
  readonly onOpenTerminal: (terminalId?: string | null) => void;
  readonly onOpenNewTerminal: () => void;
  readonly onRunProjectScript: (script: ProjectScript) => Promise<void>;
};

function useThreadGitControlModel(props: ThreadGitMenuProps) {
  const t = useTranslate();
  const navigation = useNavigation();
  const openPullRequest = useOpenPullRequest();
  const environmentId = props.environmentId;
  const canWriteSourceControl = useEnvironmentScope(
    environmentId ? EnvironmentId.make(String(environmentId)) : null,
    AuthSourceControlWriteScope,
  );
  const threadId = props.threadId;
  const { gitStatus, gitOperationLabel, onPull, onRunAction } = props;

  const currentBranchLabel = gitStatus?.refName ?? props.currentBranch ?? t("mobile.git.detached");
  const busy = gitOperationLabel !== null;
  const isRepo = gitStatus?.isRepo ?? true;
  const hasPrimaryRemote = gitStatus?.hasPrimaryRemote ?? false;
  const isDefaultRef = gitStatus?.isDefaultRef ?? false;

  const quickAction = (() => {
    if (!isRepo) {
      return {
        label: t("mobile.git.unavailable"),
        disabled: true,
        kind: "show_hint" as const,
        hint: t("mobile.git.notRepoHint"),
      };
    }
    const action = resolveQuickAction(gitStatus, busy, isDefaultRef, hasPrimaryRemote, t);
    return !canWriteSourceControl && (action.kind === "run_pull" || action.kind === "run_action")
      ? {
          ...action,
          disabled: true,
          hint: t("web.git.this-connection-cannot-change-source-control"),
        }
      : action;
  })();

  const quickActionHint = quickAction.disabled
    ? (quickAction.hint ?? t("mobile.git.actionUnavailable"))
    : null;

  const quickActionIcon: QuickActionIcon = (() => {
    if (quickAction.kind === "run_pull") return "arrow.down.circle";
    if (quickAction.kind === "open_pr") return "arrow.up.right.circle";
    if (quickAction.kind === "run_action") {
      if (quickAction.action === "commit") return "checkmark.circle";
      if (quickAction.action === "push" || quickAction.action === "commit_push")
        return "arrow.up.circle";
    }
    return "arrow.up.right.circle";
  })();

  const openExistingPr = async () => {
    const { shortLabel, singular } = sourceControlClients.get(
      gitStatus?.sourceControlProvider?.kind,
    ).changeRequest;
    const prUrl = gitStatus?.pr?.state === "open" ? gitStatus.pr.url : null;
    if (!prUrl) {
      Dialog.alert(
        t("mobile.git.noRequest", { shortLabel }),
        t("mobile.git.noRequestDetail", { kind: sourceControlTerm(t, singular) }),
      );
      return;
    }
    if (!(await openPullRequest(prUrl))) {
      Dialog.alert(
        t("mobile.git.openFailed", { shortLabel }),
        t("mobile.git.openFailedDetail", { kind: sourceControlTerm(t, singular) }),
      );
    }
  };

  const runActionWithPrompt = async (input: GitActionRequestInput) => {
    if (!canWriteSourceControl) return;
    const confirmableAction =
      input.action === "push" ||
      input.action === "create_pr" ||
      input.action === "commit_push" ||
      input.action === "commit_push_pr"
        ? input.action
        : null;
    const branchName = gitStatus?.refName;
    if (
      branchName &&
      confirmableAction &&
      !input.featureBranch &&
      requiresDefaultBranchConfirmation(input.action, isDefaultRef)
    ) {
      if (props.hasThread === false) {
        Dialog.alert(t("mobile.git.featureBranch"), t("mobile.git.featureBranchHint"));
        return;
      }
      navigation.navigate("GitConfirm", {
        environmentId: String(environmentId),
        threadId: String(threadId),
        confirmAction: confirmableAction,
        branchName,
        includesCommit: String(input.action === "commit_push" || input.action === "commit_push_pr"),
      });
      return;
    }

    await onRunAction(input);
  };

  const runQuickAction = async () => {
    if (quickAction.disabled) return;
    if (quickAction.kind === "open_pr") {
      await openExistingPr();
      return;
    }
    if (quickAction.kind === "run_pull") {
      await onPull();
      return;
    }
    if (quickAction.kind === "run_action" && quickAction.action) {
      await runActionWithPrompt({ action: quickAction.action });
    }
  };

  const openFiles = () => {
    if (props.onOpenFilesInspector) {
      props.onOpenFilesInspector();
      return;
    }
    navigation.navigate("ThreadFiles", {
      environmentId: String(environmentId),
      threadId: String(threadId),
    });
  };

  const openReview = () => {
    navigation.navigate("ThreadReview", {
      environmentId: EnvironmentId.make(String(environmentId)),
      threadId: ThreadId.make(String(threadId)),
    });
  };

  const openGitInspector = () => {
    if (props.onOpenGitInspector) {
      props.onOpenGitInspector();
      return;
    }
    navigation.navigate("GitOverview", {
      environmentId: String(environmentId),
      threadId: String(threadId),
    });
  };

  return {
    currentBranchLabel,
    isRepo,
    openFiles,
    openGitInspector,
    openReview,
    quickAction,
    quickActionHint,
    quickActionIcon,
    runQuickAction,
  };
}

function useThreadGitHeaderActionItems(props: ThreadGitControlsProps): ThreadGitHeaderActionItems {
  const t = useTranslate();
  const model = useThreadGitControlModel(props);

  return {
    terminal: {
      accessibilityLabel: t("native.openTerminal"),
      disabled: !props.canOpenTerminal,
      icon: { name: "terminal", type: "sfSymbol" },
      identifier: "thread-right-terminal",
      label: t("panels.terminal"),
      menu: {
        items: [
          ...props.projectScripts.map((script) => ({
            description: script.command,
            disabled: !props.canOperateTerminal,
            icon: { name: projectScriptMenuIcon(script.icon), type: "sfSymbol" as const },
            label: projectScriptMenuLabel(script),
            onPress: () => void props.onRunProjectScript(script),
            type: "action" as const,
          })),
          ...(props.projectScripts.length === 0
            ? [
                {
                  description: t("mobile.git.noScriptsHint"),
                  disabled: true,
                  icon: { name: "play", type: "sfSymbol" as const },
                  label: t("mobile.git.noScripts"),
                  onPress: () => {},
                  type: "action" as const,
                },
              ]
            : []),
          ...props.terminalSessions.map((session) => ({
            description: [
              getTerminalStatusLabel({
                status: session.status,
                hasRunningSubprocess: session.hasRunningSubprocess,
              }),
              basename(session.cwd),
            ]
              .filter(Boolean)
              .join(" · "),
            icon: { name: "terminal", type: "sfSymbol" as const },
            label: session.displayLabel,
            onPress: () => props.onOpenTerminal(session.terminalId),
            type: "action" as const,
          })),
          {
            description: t("mobile.git.newShellHint"),
            disabled: !props.canOperateTerminal,
            icon: { name: "plus", type: "sfSymbol" },
            label: t("mobile.git.newTerminal"),
            onPress: props.onOpenNewTerminal,
            type: "action",
          },
        ],
        title: t("panels.terminal"),
      },
      sharesBackground: true,
      type: "menu",
      variant: "plain",
    },
    files: {
      accessibilityLabel: t("native.openFiles"),
      disabled: !props.canOpenFiles,
      icon: { name: "folder", type: "sfSymbol" },
      identifier: "thread-right-files",
      label: t("panels.files"),
      onPress: model.openFiles,
      sharesBackground: true,
      type: "button",
      variant: "plain",
    },
    git: {
      accessibilityLabel: t("mobile.git.actions"),
      icon: { name: "point.topleft.down.curvedto.point.bottomright.up", type: "sfSymbol" },
      identifier: "thread-right-git",
      label: "Git",
      menu: {
        items: [
          {
            description: compactMenuStatus(props.gitStatus, t),
            disabled: true,
            icon: {
              name: "point.topleft.down.curvedto.point.bottomright.up",
              type: "sfSymbol",
            },
            label: compactMenuBranchLabel(model.currentBranchLabel),
            onPress: (): void => {},
            type: "action",
          },
          {
            description: model.quickActionHint ?? undefined,
            disabled: model.quickAction.disabled,
            icon: { name: model.quickActionIcon, type: "sfSymbol" },
            label: model.quickAction.label,
            onPress: (): void => void model.runQuickAction(),
            type: "action",
          },
          {
            description:
              props.hasThread === false
                ? t("mobile.git.afterFirstMessage")
                : t("mobile.git.reviewHint"),
            disabled: !model.isRepo || props.hasThread === false,
            icon: { name: "text.bubble", type: "sfSymbol" },
            label: t("mobile.git.review"),
            onPress: model.openReview,
            type: "action",
          },
          ...(props.onMergeBack
            ? [
                {
                  description: t("mobile.git.mergeBackHint"),
                  icon: { name: PullRequestGlyph.merged, type: "sfSymbol" as const },
                  label: t("mobile.git.mergeBack"),
                  onPress: props.onMergeBack,
                  type: "action" as const,
                },
              ]
            : []),
          {
            description:
              props.hasThread === false
                ? t("mobile.git.afterFirstMessage")
                : t("mobile.git.moreHint"),
            disabled: props.hasThread === false,
            icon: { name: "ellipsis", type: "sfSymbol" },
            label: t("chat.dynamic.more"),
            onPress: model.openGitInspector,
            type: "action",
          },
        ],
        title: "Git",
      },
      sharesBackground: true,
      type: "menu",
      variant: "plain",
    },
  };
}

export function useThreadGitRightHeaderItems(props: ThreadGitControlsProps): HeaderItems {
  const actionItems = useThreadGitHeaderActionItems(props);
  return [actionItems.git, actionItems.files, actionItems.terminal] as HeaderItems;
}

export function useThreadGitCenterHeaderItems(props: ThreadGitControlsProps): HeaderItems {
  const actionItems = useThreadGitHeaderActionItems(props);
  return [actionItems.files, actionItems.git, actionItems.terminal] as HeaderItems;
}

export function ThreadGitControls(props: ThreadGitControlsProps) {
  const t = useTranslate();
  const model = useThreadGitControlModel(props);
  const showActionControls = props.showActionControls ?? true;

  if (!showActionControls) {
    return null;
  }

  return (
    <Toolbar placement="right">
      {showActionControls && props.auxiliaryPaneControl ? (
        <Toolbar.Button
          accessibilityLabel={props.auxiliaryPaneControl.accessibilityLabel}
          icon="sidebar.right"
          onPress={props.auxiliaryPaneControl.onPress}
          separateBackground
        />
      ) : null}
      {showActionControls ? (
        <Toolbar.Menu
          accessibilityLabel={t("mobile.threads.ThreadGitControls.open-terminal")}
          icon="terminal"
          disabled={!props.canOpenTerminal}
          separateBackground
        >
          {props.projectScripts.length > 0 ? (
            props.projectScripts.map((script) => (
              <Toolbar.MenuAction
                key={script.id}
                icon={projectScriptMenuIcon(script.icon)}
                disabled={!props.canOperateTerminal}
                onPress={() => void props.onRunProjectScript(script)}
                subtitle={script.command}
              >
                <Toolbar.Label>{projectScriptMenuLabel(script)}</Toolbar.Label>
              </Toolbar.MenuAction>
            ))
          ) : (
            <Toolbar.MenuAction
              icon="play"
              disabled
              onPress={() => {}}
              subtitle={t("mobile.threads.ThreadGitControls.this-project-has-no-saved-scripts-yet")}
            >
              <Toolbar.Label>
                {t("mobile.threads.ThreadGitControls.no-project-scripts")}
              </Toolbar.Label>
            </Toolbar.MenuAction>
          )}
          {props.terminalSessions.map((session) => (
            <Toolbar.MenuAction
              key={session.terminalId}
              icon="terminal"
              onPress={() => props.onOpenTerminal(session.terminalId)}
              subtitle={[
                getTerminalStatusLabel({
                  status: session.status,
                  hasRunningSubprocess: session.hasRunningSubprocess,
                }),
                basename(session.cwd),
              ]
                .filter(Boolean)
                .join(" · ")}
            >
              <Toolbar.Label>{session.displayLabel}</Toolbar.Label>
            </Toolbar.MenuAction>
          ))}
          <Toolbar.MenuAction
            icon="plus"
            disabled={!props.canOperateTerminal}
            onPress={props.onOpenNewTerminal}
            subtitle={t("mobile.threads.ThreadGitControls.start-another-shell-for-this-thread")}
          >
            <Toolbar.Label>{t("mobile.threads.ThreadGitControls.open-new-terminal")}</Toolbar.Label>
          </Toolbar.MenuAction>
        </Toolbar.Menu>
      ) : null}
      {showActionControls && props.showDirectFileControl ? (
        <Toolbar.Button
          accessibilityLabel={t("mobile.threads.ThreadGitControls.open-files")}
          disabled={!props.canOpenFiles}
          icon="folder"
          onPress={model.openFiles}
          separateBackground
        />
      ) : null}
      {showActionControls ? createNativeHeaderMenu(threadGitMenuDefinition(props, model, t)) : null}
    </Toolbar>
  );
}

export function ThreadGitMenu(props: ThreadGitMenuProps) {
  const menu = useThreadGitMenuDefinition(props);
  return menu ? createNativeHeaderMenu(menu) : null;
}

/** Returns menu data because native toolbars serialize direct items rather than rendering component children. */
export function useThreadGitMenuDefinition(props: ThreadGitMenuProps): AppBarMenu | null {
  const t = useTranslate();
  return threadGitMenuDefinition(props, useThreadGitControlModel(props), t);
}

function threadGitMenuDefinition(
  props: ThreadGitMenuProps,
  model: ReturnType<typeof useThreadGitControlModel>,
  t: TFunction,
): AppBarMenu {
  return {
    title: t("mobile.git.controls"),
    icon: "point.topleft.down.curvedto.point.bottomright.up",
    separateBackground: false,
    items: [
      {
        id: "git-status",
        title: compactMenuBranchLabel(model.currentBranchLabel),
        icon: "point.topleft.down.curvedto.point.bottomright.up",
        disabled: true,
        subtitle: compactMenuStatus(props.gitStatus, t),
        onPress: () => {},
      },
      {
        id: "git-quick-action",
        title: model.quickAction.label,
        icon: model.quickActionIcon,
        disabled: model.quickAction.disabled,
        subtitle: model.quickActionHint ?? undefined,
        onPress: () => {
          void model.runQuickAction();
        },
      },
      {
        id: "git-review",
        title: t("mobile.git.review"),
        icon: "text.bubble",
        disabled: !model.isRepo || props.hasThread === false,
        subtitle:
          props.hasThread === false
            ? t("mobile.git.afterFirstMessage")
            : t("mobile.git.reviewHint"),
        onPress: model.openReview,
      },
      {
        id: "git-more",
        title: t("chat.dynamic.more"),
        icon: "ellipsis",
        disabled: props.hasThread === false,
        subtitle:
          props.hasThread === false ? t("mobile.git.afterFirstMessage") : t("mobile.git.moreHint"),
        onPress: model.openGitInspector,
      },
    ],
  };
}
