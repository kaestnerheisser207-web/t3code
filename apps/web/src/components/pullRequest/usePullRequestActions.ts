import type { TFunction } from "i18next";
import { sourceControlTerm } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../i18n";
import { useAtomCommand } from "~/state/use-atom-command";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import type {
  EnvironmentId,
  ProjectId,
  PullRequestAction,
  PullRequestDetail,
  PullRequestMergeMethod,
  PullRequestRef,
} from "@t3tools/contracts";
import { useRef, useState } from "react";
import {
  sourceControlClients,
  type ChangeRequestTerminology,
} from "@t3tools/client-runtime/source-control-clients";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import { useClientSettings, useEnvironmentSettings } from "~/hooks/useSettings";
import {
  deriveLogicalProjectKeyFromSettings,
  derivePhysicalProjectKey,
  selectProjectGroupingSettings,
} from "@t3tools/client-runtime/state/project-grouping";
import { buildPhysicalToLogicalProjectKeyMap } from "~/sidebarProjectGrouping";
import { useProjects } from "~/state/entities";
import { usePrimaryEnvironmentId } from "~/state/environments";

import { type DraftId, useComposerDraftStore } from "~/composerDraftStore";
import { useNewThreadHandler } from "~/hooks/useHandleNewThread";
import { usePreparePullRequestThreadAction } from "~/state/sourceControlActions";
import type { ReviewCommentContext } from "~/reviewCommentContext";
import { pullRequestEnvironment } from "~/state/pullRequests";

import { toastManager } from "../ui/toast";
import { offHeadPullRequestCheckoutToast } from "./pullRequestCheckoutToast";
import {
  checkoutFailureDescription,
  handoffPrompt,
  handoffReviewComments,
  readableFailure,
} from "./pullRequestDetail.logic";
import { pullRequestEntryKey, type EnvironmentPullRequestEntry } from "./pullRequestList.logic";

export function usePullRequestDefaultMergeMethodResolver(
  environmentId: EnvironmentId,
  projectId: ProjectId | null,
) {
  const projectDefault = useEnvironmentSettings(
    environmentId,
    (settings) => resolveProjectSettings(settings, projectId).settings.pullRequestMergeMethod,
  );
  const legacyOverrides = useClientSettings((settings) => settings.pullRequestMergeMethodOverrides);
  const grouping = useClientSettings(selectProjectGroupingSettings);
  const projects = useProjects();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  return () => {
    if (projectDefault != null) return projectDefault;
    if (Object.keys(legacyOverrides).length === 0) return undefined;
    const project = projects.find(
      (candidate) => candidate.environmentId === environmentId && candidate.id === projectId,
    );
    if (!project) return undefined;
    const key =
      buildPhysicalToLogicalProjectKeyMap({
        projects,
        settings: grouping,
        primaryEnvironmentId,
      }).get(derivePhysicalProjectKey(project)) ??
      deriveLogicalProjectKeyFromSettings(project, grouping);
    return legacyOverrides[key];
  };
}

const actionSuccessLabels = (term: string, t: TFunction): Record<PullRequestAction, string> => ({
  merge: t("pr.quick.success.merge", { kind: sourceControlTerm(t, term) }),
  ready: t("pr.quick.success.ready", { kind: sourceControlTerm(t, term) }),
  draft: t("pr.quick.success.draft", { kind: sourceControlTerm(t, term) }),
  close: t("pr.quick.success.close", { kind: sourceControlTerm(t, term) }),
  reopen: t("pr.quick.success.reopen", { kind: sourceControlTerm(t, term) }),
  "update-branch": t("pr.quick.success.update-branch", { kind: sourceControlTerm(t, term) }),
  "enable-auto-merge": t("pr.quick.success.enable-auto-merge", {
    kind: sourceControlTerm(t, term),
  }),
  "disable-auto-merge": t("pr.quick.success.disable-auto-merge", {
    kind: sourceControlTerm(t, term),
  }),
  revert: t("pr.quick.success.revert", { kind: sourceControlTerm(t, term) }),
  "delete-branch": t("web.pr.notice.branchDeleted"),
  "approve-workflows": t("pr.quick.success.approve-workflows", {
    kind: sourceControlTerm(t, term),
  }),
});

const actionFailureLabels = (term: string, t: TFunction): Record<PullRequestAction, string> => ({
  merge: t("web.pr.failure.merge", { kind: sourceControlTerm(t, term) }),
  ready: t("web.pr.failure.ready", { kind: sourceControlTerm(t, term) }),
  draft: t("web.pr.failure.draft", { kind: sourceControlTerm(t, term) }),
  close: t("web.pr.failure.close", { kind: sourceControlTerm(t, term) }),
  reopen: t("web.pr.failure.reopen", { kind: sourceControlTerm(t, term) }),
  "update-branch": t("web.pr.failure.update-branch", { kind: sourceControlTerm(t, term) }),
  "enable-auto-merge": t("web.pr.failure.enable-auto-merge", { kind: sourceControlTerm(t, term) }),
  "disable-auto-merge": t("web.pr.failure.disable-auto-merge", {
    kind: sourceControlTerm(t, term),
  }),
  revert: t("web.pr.failure.revert", { kind: sourceControlTerm(t, term) }),
  "delete-branch": t("web.pr.failure.delete-branch", { kind: sourceControlTerm(t, term) }),
  "approve-workflows": t("web.pr.failure.approve-workflows", { kind: sourceControlTerm(t, term) }),
});

const actionFailureHints = (term: string, t: TFunction): Record<PullRequestAction, string> => ({
  merge: t("web.pr.hint.merge", { kind: sourceControlTerm(t, term) }),
  ready: t("web.pr.hint.ready", { kind: sourceControlTerm(t, term) }),
  draft: t("web.pr.hint.draft", { kind: sourceControlTerm(t, term) }),
  close: t("web.pr.hint.close", { kind: sourceControlTerm(t, term) }),
  reopen: t("web.pr.hint.reopen", { kind: sourceControlTerm(t, term) }),
  "update-branch": t("pr.quick.hint.update-branch", { kind: sourceControlTerm(t, term) }),
  "enable-auto-merge": t("pr.quick.hint.enable-auto-merge", { kind: sourceControlTerm(t, term) }),
  "disable-auto-merge": t("web.pr.hint.ready", { kind: sourceControlTerm(t, term) }),
  revert: t("web.pr.hint.revert", { kind: sourceControlTerm(t, term) }),
  "delete-branch": t("web.pr.hint.delete-branch", { kind: sourceControlTerm(t, term) }),
  "approve-workflows": t("web.pr.hint.approve-workflows", { kind: sourceControlTerm(t, term) }),
});

export function usePullRequestActionRunner({
  environmentId,
  reference,
  terminology,
  onSuccess,
  resolveMergeMethod,
}: {
  environmentId: EnvironmentId;
  reference: PullRequestRef | null;
  terminology: ChangeRequestTerminology;
  onSuccess?: (action: PullRequestAction) => void;
  /** Resolve repository settings on click to avoid per-row reads. */
  resolveMergeMethod?: (detail: PullRequestDetail) => PullRequestMergeMethod;
}) {
  const t = useTranslate();
  const runAction = useAtomCommand(pullRequestEnvironment.runAction, {
    reportFailure: false,
  });
  const [actionPending, setActionPending] = useState(false);
  const pendingRef = useRef(false);

  const perform = async (action: PullRequestAction, method?: PullRequestMergeMethod) => {
    if (pendingRef.current || reference === null) return;
    pendingRef.current = true;
    setActionPending(true);
    const result = await runAction({
      environmentId,
      input: {
        ...reference,
        action,
        ...(method ? { mergeMethod: method } : resolveMergeMethod ? { resolveMergeMethod } : {}),
      },
    });
    pendingRef.current = false;
    setActionPending(false);
    if (result._tag === "Failure") {
      toastManager.add({
        type: "error",
        title: actionFailureLabels(terminology.singular, t)[action],
        description: readableFailure(
          squashAtomCommandFailure(result),
          actionFailureHints(terminology.singular, t)[action],
        ),
      });
      return;
    }
    toastManager.add({
      type: "success",
      title: actionSuccessLabels(terminology.singular, t)[action],
    });
    onSuccess?.(action);
  };

  return { actionPending, perform };
}

export function usePullRequestCloseBatch(onClosed: (entry: EnvironmentPullRequestEntry) => void) {
  const t = useTranslate();
  const runAction = useAtomCommand(pullRequestEnvironment.runAction, { reportFailure: false });
  const pending = useRef(new Set<string>());
  const [closingKeys, setClosingKeys] = useState<ReadonlySet<string>>(() => new Set());
  const close = async (entries: readonly EnvironmentPullRequestEntry[]) => {
    const batch = entries.filter((entry) => {
      const key = pullRequestEntryKey(entry);
      if (entry.state !== "open" || pending.current.has(key)) return false;
      pending.current.add(key);
      return true;
    });
    if (batch.length === 0) return;
    setClosingKeys(new Set(pending.current));
    const failures: string[] = [];
    const outcomes = await Promise.all(
      batch.map(async (entry) => {
        const result = await runAction({
          environmentId: entry.environmentId,
          input: {
            projectId: entry.projectId,
            host: entry.host,
            repository: entry.repository,
            number: entry.number,
            action: "close",
          },
        });
        pending.current.delete(pullRequestEntryKey(entry));
        setClosingKeys(new Set(pending.current));
        if (result._tag === "Failure") {
          failures.push(
            `#${entry.number}: ${readableFailure(squashAtomCommandFailure(result), actionFailureHints(sourceControlClients.get(entry.provider).changeRequest.singular, t).close)}`,
          );
          return;
        }
        onClosed(entry);
        return true;
      }),
    );
    const closed = outcomes.filter(Boolean).length;
    toastManager.add({
      type: failures.length > 0 ? "error" : "success",
      title:
        failures.length > 0
          ? `Closed ${closed} of ${batch.length} pull requests`
          : `Closed ${closed} pull request${closed === 1 ? "" : "s"}`,
      ...(failures.length > 0 ? { description: failures.slice(0, 3).join("\n") } : {}),
    });
  };
  return { close, closingKeys };
}

export interface PullRequestThreadTask {
  prompt: string;
  reviewComments?: ReadonlyArray<ReviewCommentContext>;
}

export type PullRequestHandoffDetail = Pick<
  PullRequestDetail,
  "projectId" | "workspaceRoot" | "url"
>;

const lastHandoffPromptByDraft = new Map<DraftId, string>();

export function usePullRequestHandoffs({
  environmentId,
  detail,
}: {
  environmentId: EnvironmentId;
  detail: PullRequestHandoffDetail | null;
}) {
  const t = useTranslate();
  const newThread = useNewThreadHandler();
  const prepareThread = usePreparePullRequestThreadAction({
    environmentId,
    cwd: detail?.workspaceRoot ?? null,
  });
  // Serialize all handoffs because they check out the same pull request.
  const [handoff, setHandoff] = useState<string | null>(null);
  // Prompt links hand over a URL alone, so the URL is what names the host.
  const terminology = (
    (detail && sourceControlClients.findByChangeRequestUrl(detail.url)) ||
    sourceControlClients.get(undefined)
  ).changeRequest;

  // Questions must not change checkouts or create worktrees.
  const openThreadWithTask = async (
    projectRef: ReturnType<typeof scopeProjectRef>,
    task: PullRequestThreadTask | null,
    opened?: { draftId: DraftId },
  ): Promise<{ draftId: DraftId } | null> => {
    const session =
      opened ??
      (await newThread(projectRef).then(
        (result) => result,
        () => null,
      ));
    if (session === null) return null;
    const store = useComposerDraftStore.getState();
    if (task === null) return session;
    const draft = store.getComposerDraft(session.draftId);
    const existingComments = draft?.reviewComments ?? [];
    const prompt = handoffPrompt(
      {
        prompt: draft?.prompt ?? "",
        lastHandoffPrompt: lastHandoffPromptByDraft.get(session.draftId),
      },
      task.prompt,
    );
    // Track only the handoff contribution so later handoffs preserve user text.
    lastHandoffPromptByDraft.set(session.draftId, task.prompt);
    store.setPrompt(session.draftId, prompt);
    store.setReviewComments(
      session.draftId,
      handoffReviewComments(existingComments, task.reviewComments ?? []),
    );
    return session;
  };

  const startAsk = async (kind: string, task: PullRequestThreadTask) => {
    if (!detail || handoff !== null) return;
    setHandoff(kind);
    const projectRef = scopeProjectRef(environmentId, detail.projectId);
    const opened = await openThreadWithTask(projectRef, task);
    setHandoff(null);
    if (opened === null) {
      toastManager.add({
        type: "error",
        title: t("web.pr.notice.threadFailed"),
        description: t("web.pr.notice.retryFromProject"),
      });
      return;
    }
    toastManager.add({
      type: "success",
      title: t("web.pr.notice.askedThread"),
      description:
        task.prompt.length > 0
          ? t("web.pr.notice.questionReady")
          : t("web.pr.notice.requestReady", { kind: sourceControlTerm(t, terminology.singular) }),
    });
  };

  const startHandoff = async (
    kind: string,
    task: PullRequestThreadTask | null,
    mode: "worktree" | "local" = "worktree",
  ) => {
    if (!detail || handoff !== null) return;
    setHandoff(kind);
    // Explicit timeouts survive toast updates and would pin the result after loading.
    const toastId = toastManager.add({
      type: "loading",
      title: t("web.pr.notice.preparingCheckout", {
        kind: sourceControlTerm(t, terminology.singular),
      }),
    });
    const projectRef = scopeProjectRef(environmentId, detail.projectId);
    // Checkout setup requires the thread to exist first.
    const opened = await newThread(projectRef).then(
      (session) => session,
      () => null,
    );
    if (opened === null) {
      setHandoff(null);
      toastManager.update(toastId, {
        type: "error",
        title: t("web.pr.notice.checkoutThreadFailed"),
        description: t("web.pr.notice.retryFromProject"),
      });
      return;
    }
    const prepared = await prepareThread.run({
      reference: detail.url,
      mode,
      threadId: opened.threadId,
    });
    if (prepared._tag === "Failure") {
      setHandoff(null);
      toastManager.update(toastId, {
        type: "error",
        title: t("web.pr.notice.prepareFailed", {
          kind: sourceControlTerm(t, terminology.singular),
        }),
        description: checkoutFailureDescription(
          isAtomCommandInterrupted(prepared) ? undefined : squashAtomCommandFailure(prepared),
        ),
      });
      return;
    }
    const pointed = await newThread(projectRef, {
      branch: prepared.value.branch,
      worktreePath: prepared.value.worktreePath,
      envMode: prepared.value.worktreePath === null ? "local" : "worktree",
    }).then(
      (session) => session !== null,
      () => false,
    );
    if (!pointed) {
      setHandoff(null);
      toastManager.update(toastId, {
        type: "error",
        title: t("web.pr.notice.threadNotMoved"),
        description: t("web.pr.notice.pointThread", { branch: prepared.value.branch }),
      });
      return;
    }
    setHandoff(null);
    if (task === null) {
      toastManager.update(
        toastId,
        prepared.value.isOnPullRequestHead
          ? {
              type: "success",
              title:
                mode === "local"
                  ? t("web.pr.notice.checkedOutHere")
                  : t("web.pr.notice.checkedOut"),
              description:
                mode === "local"
                  ? t("web.pr.notice.localCheckoutReady", {
                      kind: sourceControlTerm(t, terminology.singular),
                    })
                  : t("web.pr.notice.worktreeReady", {
                      kind: sourceControlTerm(t, terminology.singular),
                    }),
            }
          : offHeadPullRequestCheckoutToast(terminology, t),
      );
      return;
    }
    await openThreadWithTask(projectRef, task, opened);
    toastManager.update(
      toastId,
      prepared.value.isOnPullRequestHead
        ? {
            type: "success",
            title: t("web.pr.notice.checkoutReady"),
            description: t("web.pr.notice.taskReady"),
          }
        : offHeadPullRequestCheckoutToast(terminology, t),
    );
  };

  return { handoff, startAsk, startHandoff };
}
