import type { TFunction } from "i18next";
import { useTranslate } from "../../i18n";
import type { ThreadMoveDestination } from "../threads/threadOrder";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import * as ThreadUndo from "@t3tools/client-runtime/state/thread-undo";
import { showThreadUndoNotice } from "./thread-undo-notice";
import { canSnooze } from "@t3tools/client-runtime/state/thread-settled";
import { AuthOrchestrationOperateScope } from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as Haptics from "expo-haptics";
import { useRef } from "react";

import { withThreadDismissal } from "./thread-dismissal";
import * as Dialog from "../../components/ui/Dialog";
import { scopedThreadKey } from "../../lib/scopedEntities";
import { refreshArchivedThreadsForEnvironment } from "../archive/useArchivedThreadSnapshots";
import { pinOrderKeyBetween } from "@t3tools/client-runtime/state/thread-sort";
import { appAtomRegistry } from "../../state/atom-registry";
import { environmentServerConfigsAtom } from "../../state/server";
import { readEnvironmentScope } from "../../state/session";
import { environmentThreadShells, threadEnvironment } from "../../state/threads";
import { queuedThreadKeysAtom } from "../../state/use-thread-outbox";
import { useAtomCommand } from "../../state/use-atom-command";
import {
  beginPendingThreadOrder,
  getPendingThreadOrder,
  threadDropBusyAtom,
} from "../../state/thread-order";
import {
  createPendingThreadOrder,
  createThreadMovePlanner,
  threadDropLifecycle,
} from "../threads/threadOrder";
import { getThreadListV2OrderedSection } from "../threads/threadListV2";
import { threadCanArchive } from "./threadArchive";
import { resolveThreadTitleRename } from "../threads/thread-title-rename";

function environmentConfigLoaded(environmentId: EnvironmentThreadShell["environmentId"]) {
  return appAtomRegistry.get(environmentServerConfigsAtom).has(environmentId);
}

function environmentSupportsAutoSettleOptOut(
  environmentId: EnvironmentThreadShell["environmentId"],
) {
  return (
    appAtomRegistry.get(environmentServerConfigsAtom).get(environmentId)?.environment.capabilities
      .threadAutoSettleOptOut === true
  );
}

type ThreadListAction = "archive" | "unarchive" | "delete" | "settle" | "unsettle";

function actionFailureMessage(
  action: ThreadListAction,
  cause: Cause.Cause<unknown>,
  t: TFunction,
): string {
  const error = Cause.squash(cause);
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return t(`thread.failure.${action}`);
}

function selectionHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function actionFailureTitle(action: ThreadListAction, t: TFunction): string {
  if (action === "archive") return t("thread.action.archiveFailed");
  if (action === "unarchive") return t("thread.action.unarchiveFailed");
  if (action === "settle") return t("thread.action.settleFailed");
  if (action === "unsettle") return t("thread.action.unsettleFailed");
  return t("thread.action.deleteFailed");
}

function checkThreadOperationPermission(
  thread: EnvironmentThreadShell,
  title: string,
  t: TFunction,
): boolean {
  if (readEnvironmentScope(thread.environmentId, AuthOrchestrationOperateScope)) return true;
  Dialog.alert(title, t("thread.action.noPermission"));
  return false;
}

function useThreadActionExecutor(
  onCompleted?: (action: ThreadListAction, thread: EnvironmentThreadShell) => void,
) {
  const t = useTranslate();
  const archiveMutation = useAtomCommand(threadEnvironment.archive, { reportFailure: false });
  const unarchiveMutation = useAtomCommand(threadEnvironment.unarchive, { reportFailure: false });
  const deleteMutation = useAtomCommand(threadEnvironment.delete, { reportFailure: false });
  const settleMutation = useAtomCommand(threadEnvironment.settle, { reportFailure: false });
  const unsettleMutation = useAtomCommand(threadEnvironment.unsettle, { reportFailure: false });
  const inFlightThreadKeys = useRef(new Set<string>());

  const executeAction = async (
    action: ThreadListAction,
    thread: EnvironmentThreadShell,
    onStarted?: () => void,
  ) => {
    if (!checkThreadOperationPermission(thread, actionFailureTitle(action, t), t)) return false;
    const key = scopedThreadKey(thread.environmentId, thread.id);
    if (inFlightThreadKeys.current.has(key)) {
      return false;
    }

    inFlightThreadKeys.current.add(key);
    selectionHaptic();
    const succeeded = await (async () => {
      if (
        (action === "settle" || action === "unsettle") &&
        !environmentConfigLoaded(thread.environmentId)
      ) {
        Dialog.alert(
          actionFailureTitle(action, t),
          t(
            "thread.constraints.this-environment-s-server-does-not-support-settling-yet-update-the-server-to-use-settle",
          ),
        );
        return false;
      }
      if (action === "archive" && !threadCanArchive(thread.runtime)) {
        Dialog.alert(
          actionFailureTitle(action, t),
          t("thread.constraints.this-thread-is-working-interrupt-it-first-then-try-again"),
        );
        return false;
      }
      if (action === "unsettle") ThreadUndo.invalidate("settle", key);
      if (action === "archive" || action === "delete") {
        for (const kind of ["settle", "snooze", "pin"]) ThreadUndo.invalidate(kind, key);
      }
      onStarted?.();
      const result = await withThreadDismissal(
        key,
        async () =>
          action === "unsettle"
            ? // reason "user" pins the thread active: auto-settle stays
              // suppressed until real activity clears the pin server-side.
              await unsettleMutation({
                environmentId: thread.environmentId,
                input: { threadId: thread.id, reason: "user" },
              })
            : await (
                action === "settle"
                  ? settleMutation
                  : action === "archive"
                    ? archiveMutation
                    : action === "unarchive"
                      ? unarchiveMutation
                      : deleteMutation
              )({
                environmentId: thread.environmentId,
                input: { threadId: thread.id },
              }),
        (result) => result._tag === "Success",
      );
      if (result._tag === "Failure") {
        Dialog.alert(actionFailureTitle(action, t), actionFailureMessage(action, result.cause, t));
        return false;
      }
      if (action === "archive" || action === "unarchive" || action === "delete") {
        refreshArchivedThreadsForEnvironment(thread.environmentId);
      }
      onCompleted?.(action, thread);
      return true;
    })();
    inFlightThreadKeys.current.delete(key);
    return succeeded;
  };

  return executeAction;
}

// Hookless use* functions skip compilation, leaving their returned handlers unstable.
function confirmThreadDeletion(
  executeAction: (action: ThreadListAction, thread: EnvironmentThreadShell) => Promise<boolean>,
  thread: EnvironmentThreadShell,
  t: TFunction,
) {
  if (!checkThreadOperationPermission(thread, actionFailureTitle("delete", t), t)) return;
  const title = t("thread.action.deleteTitle");
  const message = t("thread.action.deleteDescription", { thread: thread.title });
  Dialog.confirm({
    title,
    message,
    confirmText: t("thread.action.delete"),
    destructive: true,
    onConfirm: () => {
      void executeAction("delete", thread);
    },
  });
}

export function useThreadListActions(): {
  readonly archiveThread: (thread: EnvironmentThreadShell) => Promise<boolean>;
  readonly confirmDeleteThread: (thread: EnvironmentThreadShell) => void;
  readonly settleThread: (thread: EnvironmentThreadShell) => Promise<boolean>;
  readonly snoozeThread: (thread: EnvironmentThreadShell, snoozedUntil: string) => Promise<boolean>;
  readonly unsnoozeThread: (thread: EnvironmentThreadShell) => Promise<boolean>;
  readonly unsettleThread: (thread: EnvironmentThreadShell) => Promise<boolean>;
  readonly pinThread: (thread: EnvironmentThreadShell) => Promise<boolean>;
  readonly unpinThread: (thread: EnvironmentThreadShell) => Promise<boolean>;
  readonly setThreadAutoSettle: (
    thread: EnvironmentThreadShell,
    enabled: boolean,
  ) => Promise<boolean>;
  readonly moveThread: (
    thread: EnvironmentThreadShell,
    direction: ThreadMoveDestination,
  ) => Promise<boolean>;
  readonly renameThread: (thread: EnvironmentThreadShell) => void;
  readonly regenerateThreadTitle: (thread: EnvironmentThreadShell) => Promise<boolean>;
} {
  const t = useTranslate();
  const executeAction = useThreadActionExecutor();
  const snoozeMutation = useAtomCommand(threadEnvironment.snooze, { reportFailure: false });
  const unsnoozeMutation = useAtomCommand(threadEnvironment.unsnooze, { reportFailure: false });
  const pinMutation = useAtomCommand(threadEnvironment.pin, { reportFailure: false });
  const unpinMutation = useAtomCommand(threadEnvironment.unpin, { reportFailure: false });
  const setAutoSettleMutation = useAtomCommand(threadEnvironment.setAutoSettle, {
    reportFailure: false,
  });
  const updateThreadMetadata = useAtomCommand(threadEnvironment.updateMetadata, {
    reportFailure: false,
  });
  const snoozeInFlightThreadKeys = useRef(new Set<string>());
  const titleRegenerationInFlightThreadKeys = useRef(new Set<string>());

  const archiveThread = (thread: EnvironmentThreadShell) => executeAction("archive", thread);
  const offerUndo = (
    thread: EnvironmentThreadShell,
    action: "Settled" | "Snoozed" | "Unpinned",
    claim: ReturnType<typeof ThreadUndo.begin>,
    plan: ThreadUndo.ThreadUndoPlan,
  ) =>
    showThreadUndoNotice({
      action,
      claim,
      undo: async () => {
        try {
          await ThreadUndo.executeThreadUndo(
            plan,
            async (step) => {
              switch (step.action) {
                case "unsettle":
                  return unsettleThread(thread);
                case "unsnooze":
                  return unsnoozeThread(thread);
                case "pin":
                  return pinThread(thread, step.orderKey);
                case "snooze": {
                  const failureTitle =
                    action === "Unpinned"
                      ? t("thread.action.undoUnpinFailed")
                      : t("thread.action.undoSettleFailed");
                  if (!checkThreadOperationPermission(thread, failureTitle, t)) return false;
                  const result = await snoozeMutation({
                    environmentId: thread.environmentId,
                    input: { threadId: thread.id, snoozedUntil: step.snoozedUntil },
                  });
                  if (result._tag === "Failure") {
                    const error = Cause.squash(result.cause);
                    Dialog.alert(
                      t("thread.action.restoreSnoozeFailed"),
                      error instanceof Error ? error.message : t("thread.action.snoozeError"),
                    );
                    return false;
                  }
                  return true;
                }
              }
            },
            (result) => result,
          );
        } catch (error) {
          Dialog.alert(
            t("thread.action.undoFailed"),
            error instanceof Error ? error.message : t("thread.action.tryAgain"),
          );
        }
      },
    });
  const settleThread = async (thread: EnvironmentThreadShell) => {
    const key = scopedThreadKey(thread.environmentId, thread.id);
    const plan = ThreadUndo.planThreadUndo("settle", thread);
    let claim: ReturnType<typeof ThreadUndo.begin> | undefined;
    const succeeded = await executeAction("settle", thread, () => {
      ThreadUndo.invalidate("pin", key);
      ThreadUndo.invalidate("snooze", key);
      claim = ThreadUndo.begin("settle", key);
    });
    if (claim) {
      if (succeeded) offerUndo(thread, "Settled", claim, plan);
      else claim.finish();
    }
    return succeeded;
  };
  const snoozeThread = async (thread: EnvironmentThreadShell, snoozedUntil: string) => {
    if (!checkThreadOperationPermission(thread, t("thread.action.snoozeFailed"), t)) return false;
    const key = scopedThreadKey(thread.environmentId, thread.id);
    if (snoozeInFlightThreadKeys.current.has(key)) {
      return false;
    }
    snoozeInFlightThreadKeys.current.add(key);
    const succeeded = await (async () => {
      if (!environmentConfigLoaded(thread.environmentId)) {
        Dialog.alert(
          t("thread.action.snoozeFailed"),
          t(
            "thread.constraints.this-environment-s-server-does-not-support-snoozing-yet-update-the-server-to-use-snooze",
          ),
        );
        return false;
      }
      if (!canSnooze(thread, { now: new Date().toISOString() })) {
        Dialog.alert(
          t("thread.action.snoozeFailed"),
          thread.hasPendingApprovals ||
            thread.hasPendingUserInput ||
            thread.pendingSubagentRequest != null
            ? t(
                "thread.constraints.this-thread-is-waiting-on-you-respond-to-the-pending-request-before-snoozing-it",
              )
            : t(
                "thread.constraints.this-thread-is-still-starting-a-turn-try-again-once-it-s-running",
              ),
        );
        return false;
      }

      selectionHaptic();
      const claim = ThreadUndo.begin("snooze", key);
      const result = await withThreadDismissal(
        key,
        () =>
          snoozeMutation({
            environmentId: thread.environmentId,
            input: {
              threadId: thread.id,
              snoozedUntil,
            },
          }),
        (result) => result._tag === "Success",
      );
      if (result._tag === "Failure") {
        claim.finish();
        const error = Cause.squash(result.cause);
        Dialog.alert(
          t("thread.action.snoozeFailed"),
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t("thread.action.snoozeError"),
        );
        return false;
      }
      offerUndo(thread, "Snoozed", claim, ThreadUndo.planThreadUndo("snooze"));
      return true;
    })();
    snoozeInFlightThreadKeys.current.delete(key);
    return succeeded;
  };
  const unsnoozeThread = async (thread: EnvironmentThreadShell) => {
    if (!checkThreadOperationPermission(thread, t("thread.constraints.could-not-wake-thread"), t))
      return false;
    const key = scopedThreadKey(thread.environmentId, thread.id);
    if (snoozeInFlightThreadKeys.current.has(key)) {
      return false;
    }
    snoozeInFlightThreadKeys.current.add(key);
    const succeeded = await (async () => {
      if (!environmentConfigLoaded(thread.environmentId)) {
        Dialog.alert(
          t("thread.constraints.could-not-wake-thread"),
          t(
            "thread.constraints.this-environment-s-server-does-not-support-snoozing-yet-update-the-server-to-wake-this-thread",
          ),
        );
        return false;
      }

      selectionHaptic();
      ThreadUndo.invalidate("snooze", key);
      const result = await withThreadDismissal(
        key,
        () =>
          unsnoozeMutation({
            environmentId: thread.environmentId,
            input: { threadId: thread.id, reason: "user" },
          }),
        (result) => result._tag === "Success",
      );
      if (result._tag === "Failure") {
        const error = Cause.squash(result.cause);
        Dialog.alert(
          t("thread.constraints.could-not-wake-thread"),
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t("thread.constraints.the-thread-could-not-be-woken"),
        );
        return false;
      }
      return true;
    })();
    snoozeInFlightThreadKeys.current.delete(key);
    return succeeded;
  };
  const unsettleThread = async (thread: EnvironmentThreadShell) =>
    (await executeAction("unsettle", thread)) === true;
  const pinThread = async (thread: EnvironmentThreadShell, restoreOrderKey?: string) => {
    if (!checkThreadOperationPermission(thread, t("thread.constraints.could-not-pin-thread"), t))
      return false;
    if (!environmentConfigLoaded(thread.environmentId)) {
      Dialog.alert(
        t("thread.constraints.could-not-pin-thread"),
        t(
          "thread.constraints.this-environment-s-server-does-not-support-pinning-yet-update-the-server-to-use-pin",
        ),
      );
      return false;
    }
    selectionHaptic();
    const shells = appAtomRegistry.get(environmentThreadShells.threadShellsAtom);
    let firstKey: string | null = null;
    for (const shell of shells) {
      if (shell.pinnedAt == null || shell.pinOrderKey == null) continue;
      if (firstKey === null || shell.pinOrderKey < firstKey) firstKey = shell.pinOrderKey;
    }
    const orderKey = restoreOrderKey ?? pinOrderKeyBetween(null, firstKey) ?? undefined;
    ThreadUndo.invalidate("pin", scopedThreadKey(thread.environmentId, thread.id));
    // Pinning clears snooze, so older Settled or Snoozed undos would fight this pin.
    ThreadUndo.invalidate("settle", scopedThreadKey(thread.environmentId, thread.id));
    ThreadUndo.invalidate("snooze", scopedThreadKey(thread.environmentId, thread.id));
    const result = await withThreadDismissal(
      scopedThreadKey(thread.environmentId, thread.id),
      () =>
        pinMutation({
          environmentId: thread.environmentId,
          input: { threadId: thread.id, ...(orderKey !== undefined ? { orderKey } : {}) },
        }),
      (result) => result._tag === "Success",
    );
    if (result._tag === "Failure") {
      const error = Cause.squash(result.cause);
      Dialog.alert(
        t("thread.constraints.could-not-pin-thread"),
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("thread.constraints.the-thread-could-not-be-pinned"),
      );
      return false;
    }
    return true;
  };
  const unpinThread = async (thread: EnvironmentThreadShell) => {
    if (!checkThreadOperationPermission(thread, t("thread.constraints.could-not-unpin-thread"), t))
      return false;
    if (!environmentConfigLoaded(thread.environmentId)) {
      Dialog.alert(
        t("thread.constraints.could-not-unpin-thread"),
        t(
          "thread.constraints.this-environment-s-server-does-not-support-pinning-yet-update-the-server-to-use-pin",
        ),
      );
      return false;
    }
    selectionHaptic();
    const plan = ThreadUndo.planThreadUndo("unpin", thread);
    const claim = ThreadUndo.begin("pin", scopedThreadKey(thread.environmentId, thread.id));
    const result = await withThreadDismissal(
      scopedThreadKey(thread.environmentId, thread.id),
      () =>
        unpinMutation({
          environmentId: thread.environmentId,
          input: { threadId: thread.id },
        }),
      (result) => result._tag === "Success",
    );
    if (result._tag === "Failure") {
      claim.finish();
      const error = Cause.squash(result.cause);
      Dialog.alert(
        t("thread.constraints.could-not-unpin-thread"),
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("thread.constraints.the-thread-could-not-be-unpinned"),
      );
      return false;
    }
    offerUndo(thread, "Unpinned", claim, plan);
    return true;
  };
  const setThreadAutoSettle = async (thread: EnvironmentThreadShell, enabled: boolean) => {
    if (!environmentSupportsAutoSettleOptOut(thread.environmentId)) {
      Dialog.alert(
        t("thread.constraints.could-not-update-auto-settle"),
        t(
          "thread.constraints.this-environment-s-server-does-not-support-turning-auto-settle-off-per-thread-yet-update-the-server-to-use-it",
        ),
      );
      return false;
    }
    selectionHaptic();
    const result = await setAutoSettleMutation({
      environmentId: thread.environmentId,
      input: { threadId: thread.id, enabled },
    });
    if (result._tag === "Failure") {
      const error = Cause.squash(result.cause);
      Dialog.alert(
        t("thread.constraints.could-not-update-auto-settle"),
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("thread.constraints.the-auto-settle-setting-could-not-be-changed"),
      );
      return false;
    }
    return true;
  };
  const regenerateThreadTitle = async (thread: EnvironmentThreadShell) => {
    if (
      !checkThreadOperationPermission(thread, t("thread.constraints.could-not-regenerate-title"), t)
    )
      return false;
    const key = scopedThreadKey(thread.environmentId, thread.id);
    if (thread.titleRegeneration != null || titleRegenerationInFlightThreadKeys.current.has(key)) {
      return false;
    }
    if (!environmentConfigLoaded(thread.environmentId)) {
      Dialog.alert(
        t("thread.constraints.could-not-regenerate-title"),
        t(
          "thread.constraints.this-environment-s-server-does-not-support-title-regeneration-yet-update-the-server-to-regenerate-thread-titles",
        ),
      );
      return false;
    }

    titleRegenerationInFlightThreadKeys.current.add(key);
    selectionHaptic();
    const succeeded = await (async () => {
      const result = await updateThreadMetadata({
        environmentId: thread.environmentId,
        input: { threadId: thread.id, regenerateTitle: true },
      });
      if (result._tag === "Failure") {
        const error = Cause.squash(result.cause);
        Dialog.alert(
          t("thread.constraints.could-not-regenerate-title"),
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t("thread.constraints.the-thread-title-could-not-be-regenerated"),
        );
        return false;
      }
      return true;
    })();
    titleRegenerationInFlightThreadKeys.current.delete(key);
    return succeeded;
  };
  const renameThread = (thread: EnvironmentThreadShell) => {
    const commit = (title: string) => {
      const resolution = resolveThreadTitleRename({ title, originalTitle: thread.title });
      if (resolution.action === "reject-empty") {
        Dialog.alert(
          t("thread.action.renameFailed"),
          t("thread.constraints.thread-title-cannot-be-empty"),
        );
        return;
      }
      if (resolution.action === "noop") return;
      selectionHaptic();
      void updateThreadMetadata({
        environmentId: thread.environmentId,
        input: { threadId: thread.id, title: resolution.title },
      }).then((result) => {
        if (result._tag === "Success") return;
        const error = Cause.squash(result.cause);
        Dialog.alert(
          t("thread.action.renameFailed"),
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t("thread.action.renameError"),
        );
      });
    };

    Dialog.prompt({
      title: t("thread.action.renameTitle"),
      initialValue: thread.title,
      confirmText: t("thread.action.rename"),
      onConfirm: commit,
    });
  };

  // Plan against the complete section so filtering does not change a move.
  const reorderPinnedMutation = useAtomCommand(threadEnvironment.reorderPin, {
    reportFailure: false,
  });
  const reorderActiveMutation = useAtomCommand(threadEnvironment.reorderActive, {
    reportFailure: false,
  });
  const moveThread = async (thread: EnvironmentThreadShell, direction: ThreadMoveDestination) => {
    if (!checkThreadOperationPermission(thread, t("thread.constraints.could-not-move-thread"), t))
      return false;
    if (getPendingThreadOrder() !== null || appAtomRegistry.get(threadDropBusyAtom)) return false;
    const shells = appAtomRegistry.get(environmentThreadShells.navigationThreadShellsAtom);
    const current = shells.find(
      (row) => row.id === thread.id && row.environmentId === thread.environmentId,
    );
    if (!current || current.archivedAt !== null) return false;
    thread = current;
    const section =
      typeof direction === "object" && direction.section !== undefined
        ? direction.section
        : thread.pinnedAt != null
          ? "pinned"
          : "active";
    if (section === "settled") {
      if (!environmentConfigLoaded(thread.environmentId)) return false;
      appAtomRegistry.set(threadDropBusyAtom, true);
      const settled = await settleThread(thread);
      appAtomRegistry.set(threadDropBusyAtom, false);
      return settled;
    }
    const configs = appAtomRegistry.get(environmentServerConfigsAtom);
    if (!configs.has(thread.environmentId)) {
      Dialog.alert(
        t("thread.constraints.could-not-move-thread"),
        t(
          "thread.constraints.this-environment-s-server-does-not-support-reordering-these-threads-update-the-server-to-arrange-them",
        ),
      );
      return false;
    }
    const ordered = getThreadListV2OrderedSection({
      threads: shells,
      section,
      now: new Date().toISOString(),
      queuedThreadKeys: appAtomRegistry.get(queuedThreadKeysAtom),
      settlementEnvironmentIds: new Set(configs.keys()),
      snoozeEnvironmentIds: new Set(configs.keys()),
    });
    const assignments = createThreadMovePlanner({
      allThreads: shells,
      ordered,
      section,
      reorderableEnvironmentIds: new Set(configs.keys()),
    })(scopedThreadKey(thread.environmentId, thread.id), direction);
    if (assignments === null) return false;
    const lifecycle = threadDropLifecycle(thread, section, new Date().toISOString());
    const crossSection = !ordered.some(
      (row) => row.id === thread.id && row.environmentId === thread.environmentId,
    );
    const shellByKey = new Map(
      shells.map((shell) => [scopedThreadKey(shell.environmentId, shell.id), shell]),
    );
    for (const assignment of assignments) {
      const target = shellByKey.get(assignment.id);
      if (
        target &&
        !checkThreadOperationPermission(target, t("thread.constraints.could-not-move-thread"), t)
      )
        return false;
    }
    selectionHaptic();
    appAtomRegistry.set(threadDropBusyAtom, true);
    const pending = crossSection
      ? null
      : beginPendingThreadOrder(
          createPendingThreadOrder({
            section,
            ordered,
            movedId: scopedThreadKey(thread.environmentId, thread.id),
            direction,
            assignments,
          }),
        );
    const reorder = section === "pinned" ? reorderPinnedMutation : reorderActiveMutation;
    const moved = await (async () => {
      if (crossSection) {
        if (section === "pinned") {
          const orderKey = assignments.find(
            ({ id }) => id === scopedThreadKey(thread.environmentId, thread.id),
          )?.orderKey;
          // Same as pinThread: older Unpinned, Settled, or Snoozed undos would fight this pin.
          ThreadUndo.invalidate("pin", scopedThreadKey(thread.environmentId, thread.id));
          ThreadUndo.invalidate("settle", scopedThreadKey(thread.environmentId, thread.id));
          ThreadUndo.invalidate("snooze", scopedThreadKey(thread.environmentId, thread.id));
          const result = await pinMutation({
            environmentId: thread.environmentId,
            input: { threadId: thread.id, ...(orderKey === undefined ? {} : { orderKey }) },
          });
          if (result._tag === "Failure") {
            Dialog.alert(
              t("thread.constraints.could-not-pin-thread"),
              String(Cause.squash(result.cause)),
            );
            return false;
          }
        } else {
          if (lifecycle.unpin && !(await unpinThread(thread))) return false;
          if (lifecycle.unsettle && !(await unsettleThread(thread))) return false;
          if (lifecycle.unsnooze && !(await unsnoozeThread(thread))) return false;
        }
      }
      for (const assignment of assignments) {
        if (
          crossSection &&
          section === "pinned" &&
          thread.pinnedAt == null &&
          assignment.id === scopedThreadKey(thread.environmentId, thread.id)
        )
          continue;
        if (pending !== null && !pending.isPending()) return false;
        const target = shellByKey.get(assignment.id);
        if (target === undefined) continue;
        if (
          !checkThreadOperationPermission(target, t("thread.constraints.could-not-move-thread"), t)
        )
          return false;
        ThreadUndo.invalidate("pin", scopedThreadKey(target.environmentId, target.id));
        const result = await reorder({
          environmentId: target.environmentId,
          input: { threadId: target.id, orderKey: assignment.orderKey },
        });
        if (result._tag === "Failure") {
          const error = Cause.squash(result.cause);
          Dialog.alert(
            t("thread.constraints.could-not-move-thread"),
            error instanceof Error && error.message.trim().length > 0
              ? error.message
              : t("thread.constraints.the-thread-could-not-be-moved"),
          );
          return false;
        }
      }
      pending?.complete();
      return true;
    })();
    if (!moved) pending?.cancel();
    appAtomRegistry.set(threadDropBusyAtom, false);
    return moved;
  };

  const confirmDeleteThread = (thread: EnvironmentThreadShell) =>
    confirmThreadDeletion(executeAction, thread, t);

  return {
    archiveThread,
    confirmDeleteThread,
    settleThread,
    snoozeThread,
    unsnoozeThread,
    unsettleThread,
    pinThread,
    unpinThread,
    setThreadAutoSettle,
    moveThread,
    renameThread,
    regenerateThreadTitle,
  };
}

export function useArchivedThreadListActions(
  onCompleted: (thread: EnvironmentThreadShell) => void,
): {
  readonly unarchiveThread: (thread: EnvironmentThreadShell) => void;
  readonly confirmDeleteThread: (thread: EnvironmentThreadShell) => void;
} {
  const t = useTranslate();
  const handleCompleted = (_action: ThreadListAction, thread: EnvironmentThreadShell) => {
    onCompleted(thread);
  };
  const executeAction = useThreadActionExecutor(handleCompleted);
  const unarchiveThread = (thread: EnvironmentThreadShell) => {
    void executeAction("unarchive", thread);
  };
  const confirmDeleteThread = (thread: EnvironmentThreadShell) =>
    confirmThreadDeletion(executeAction, thread, t);

  return { unarchiveThread, confirmDeleteThread };
}
