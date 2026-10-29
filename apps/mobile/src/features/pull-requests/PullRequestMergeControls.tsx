import { sourceControlTerm } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../i18n";
import { AppActivityIndicator } from "../../components/ui/AppActivityIndicator";
import * as Dialog from "../../components/ui/Dialog";
import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import type { PullRequestDetail, PullRequestMergeMethod } from "@t3tools/contracts";
import { AsyncResult } from "effect/reactivity";
import { useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { AppText as Text } from "../../components/ui/AppText";
import { SymbolView } from "../../components/ui/AppSymbol";
import { Menu } from "../../components/ui/Menu";
import { Button } from "../../components/ui/Button";
import { IconButton } from "../../components/ui/IconButton";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import { composerPullRequests } from "../../state/pull-requests";
import { useAtomCommand } from "../../state/use-atom-command";
import {
  allowedMergeMethods,
  canPerformPullRequestAction,
  mergeUnavailableReason,
  mergeUnavailableCode,
  mergeMethodPresentation,
  pullRequestActionLabel,
} from "./pullRequestActions";
import { pullRequestStackMerge, singlePullRequestMergeAllowed } from "./pullRequestStack";
import { pullRequestTarget, type PullRequestParams } from "./usePullRequestDiff";
import { usePullRequestPermissions } from "./usePullRequestPermissions";
import type { PullRequestStackState } from "./usePullRequestStack";
import { PullRequestGlyph } from "./pullRequestGlyphs";

export function PullRequestMergeControls(props: {
  readonly pr: PullRequestDetail;
  readonly params: PullRequestParams;
  readonly stack: PullRequestStackState;
}) {
  const t = useTranslate();
  const { pr, stack } = props;
  const terminology = sourceControlClients.get(pr.provider).changeRequest;
  const target = pullRequestTarget(props.params);
  const permissions = usePullRequestPermissions(props.params, pr);
  const preferences = useAtomValue(mobilePreferencesAtom);
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const runAction = useAtomCommand(composerPullRequests.runAction, { reportFailure: false });
  const refreshDetail = useAtomRefresh(composerPullRequests.detail(target));
  const refreshActivity = useAtomRefresh(composerPullRequests.activity(target));
  const [selectedMethod, setSelectedMethod] = useState<PullRequestMergeMethod | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const methods = allowedMergeMethods(pr);
  const preferred =
    selectedMethod ??
    (AsyncResult.isSuccess(preferences) ? preferences.value.pullRequestMergeMethod : undefined) ??
    "squash";
  const method = methods.includes(preferred)
    ? preferred
    : methods.includes("squash")
      ? "squash"
      : methods[0];
  const scope = stack.stack ? pullRequestStackMerge(stack.stack, pr.number, terminology, t) : null;
  const canMergeSingle = singlePullRequestMergeAllowed({
    supportsStackActions: stack.supportsStackActions,
    hasStack: stack.stack !== null,
    isFresh: stack.isFresh,
  });
  const checkingStack =
    permissions.connected && stack.supportsStackActions && !stack.isFresh && !stack.error;
  const primaryReasonCode = !permissions.connected
    ? "reconnect"
    : mergeUnavailableCode(pr, permissions.canWrite);
  const primaryReason =
    primaryReasonCode === "reconnect"
      ? t("pr.merge.reconnect")
      : mergeUnavailableReason(pr, permissions.canWrite, terminology, t);
  const stackReasonCode = stack.stack
    ? !stack.supportsStackActions
      ? "stackUnsupported"
      : !stack.isFresh
        ? "refreshStack"
        : null
    : !canMergeSingle
      ? stack.error
        ? "stackCheckFailed"
        : "checkingStack"
      : null;
  const reason =
    primaryReason ?? (stackReasonCode ? t(`pr.merge.${stackReasonCode}`) : scope?.reason);
  const hideReason =
    primaryReasonCode === "conflicts" ||
    (primaryReasonCode === null &&
      (stackReasonCode === "checkingStack" ||
        (checkingStack && stackReasonCode === "refreshStack")));
  const canMerge = !busy && method !== undefined && !reason;
  const label = method
    ? scope && scope.layers.length > 1
      ? t("pr.merge.stackButton", {
          method: mergeMethodPresentation(method, t).title,
          count: scope.layers.length,
        })
      : mergeMethodPresentation(method, t).title
    : t("pr.merge.unavailable");
  const autoAction = pr.autoMergeEnabled ? "disable-auto-merge" : "enable-auto-merge";
  const canAutoMerge =
    !busy &&
    (autoAction === "disable-auto-merge" || (!stack.stack && canMergeSingle)) &&
    permissions.canWrite &&
    canPerformPullRequestAction(pr, autoAction);

  const perform = async (action: "merge" | "enable-auto-merge" | "disable-auto-merge") => {
    if (
      pending.current ||
      (action !== "disable-auto-merge" && !method) ||
      (action === "merge" ? !canMerge : !canAutoMerge)
    )
      return;
    pending.current = true;
    setBusy(true);
    const response = await runAction({
      ...target,
      input: {
        ...target.input,
        action,
        ...(action === "merge" && method && stack.stack && scope
          ? {
              stackNumber: stack.stack.number,
              expectedStackHeads: scope.heads,
              mergeMethod: method,
            }
          : action === "merge" && method
            ? {
                resolveMergeMethod: (fresh) => {
                  if (
                    !canPerformPullRequestAction(fresh, "merge") ||
                    !allowedMergeMethods(fresh).includes(method)
                  )
                    throw new Error(
                      t("pr.merge.changed", { kind: sourceControlTerm(t, terminology.singular) }),
                    );
                  return method;
                },
              }
            : action === "enable-auto-merge" && method
              ? { mergeMethod: method }
              : {}),
      },
    });
    // A stack can partly merge before the provider reports a failure.
    refreshDetail();
    refreshActivity();
    stack.refresh();
    pending.current = false;
    setBusy(false);
    if (AsyncResult.isFailure(response)) {
      const cause = squashAtomCommandFailure(response);
      Dialog.alert(
        t("pr.actions.failed"),
        cause instanceof Error ? cause.message : t("settings.support.try-again"),
      );
    }
  };
  const confirm = (action: "merge" | "enable-auto-merge" | "disable-auto-merge") => {
    const title =
      action === "merge"
        ? scope && scope.layers.length > 1
          ? t("pr.merge.stackConfirm", { count: scope.layers.length })
          : t("pr.merge.confirm", { kind: sourceControlTerm(t, terminology.singular) })
        : action === "enable-auto-merge"
          ? t("pr.merge.enableAutoConfirm")
          : t("pr.merge.disableAutoConfirm");
    const methodLabel = method ? t(`pr.merge.method.${method}`) : "";
    const message =
      action === "merge" && scope
        ? t("pr.merge.stackDetail", {
            layers: scope.layers.map((layer) => `#${layer.number}`).join(" → "),
            base: stack.stack?.base ?? "",
            method: methodLabel,
            number: pr.number,
          })
        : action === "enable-auto-merge"
          ? t("pr.merge.enableAutoDetail", { number: pr.number, method: methodLabel })
          : action === "disable-auto-merge"
            ? t("pr.merge.disableAutoDetail", { kind: sourceControlTerm(t, terminology.singular) })
            : t("pr.merge.detail", { number: pr.number, base: pr.baseBranch, method: methodLabel });
    Dialog.alert(title, message, [
      { text: t("composer.ui.cancel"), style: "cancel" },
      {
        text: action === "merge" ? label : pullRequestActionLabel(action, terminology, t),
        onPress: () => void perform(action),
      },
    ]);
  };
  return (
    <View className="gap-2 border-t border-border-subtle p-3">
      <View
        className={
          Platform.OS === "android"
            ? "flex-row items-center gap-2"
            : `flex-row overflow-hidden rounded-xl border-continuous ${canMerge ? "bg-prominent-action" : "bg-subtle-strong"}`
        }
      >
        {Platform.OS === "android" ? (
          <View className="min-w-0 flex-1">
            <Button
              label={
                busy
                  ? t("mobile.dynamic.PullRequestMergeControls.working")
                  : !permissions.connected
                    ? t("mobile.dynamic.PullRequestMergeControls.reconnect-to-merge")
                    : label
              }
              tone="primary"
              fullWidth
              disabled={!canMerge}
              loading={busy || checkingStack}
              onPress={() => confirm("merge")}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              scope
                ? t(
                    "mobile.dynamic.PullRequestMergeControls.param-param-stack-layers-through-param",
                    { label: label, length: scope.layers.length, number: pr.number },
                  )
                : label
            }
            accessibilityState={{ disabled: !canMerge, busy: busy || checkingStack }}
            disabled={!canMerge}
            onPress={() => confirm("merge")}
            className="min-h-11 min-w-0 flex-1 flex-row items-center justify-center gap-2 px-3 py-2 active:opacity-70"
          >
            {busy || checkingStack ? (
              <AppActivityIndicator size="small" colorClassName="accent-icon-muted" />
            ) : (
              <SymbolView
                name={PullRequestGlyph.merged}
                size={16}
                tintColorClassName={
                  canMerge ? "accent-prominent-action-foreground" : "accent-icon-muted"
                }
              />
            )}
            <Text
              className={`shrink text-center text-sm font-t3-semibold ${canMerge ? "text-prominent-action-foreground" : "text-foreground-muted"}`}
            >
              {busy
                ? t("mobile.dynamic.PullRequestMergeControls.working")
                : !permissions.connected
                  ? t("mobile.dynamic.PullRequestMergeControls.reconnect-to-merge")
                  : label}
            </Text>
          </Pressable>
        )}
        {methods.length > 0 || canAutoMerge ? (
          <Menu
            title={t("mobile.review.PullRequestMergeControls.merge-options")}
            actions={[
              ...methods.map((id) => ({
                id,
                title: mergeMethodPresentation(id, t).title,
                state: id === method ? ("on" as const) : ("off" as const),
                attributes: { disabled: busy },
              })),
              ...(canAutoMerge
                ? [
                    {
                      id: autoAction,
                      title: t(
                        pr.autoMergeEnabled ? "pr.action.disableAuto" : "pr.action.enableAuto",
                      ),
                      image: "clock",
                    },
                  ]
                : []),
            ]}
            onPressAction={({ nativeEvent }) => {
              const selected = methods.find((id) => id === nativeEvent.event);
              if (selected) {
                setSelectedMethod(selected);
                savePreferences({ pullRequestMergeMethod: selected });
              } else if (nativeEvent.event === autoAction && canAutoMerge) confirm(autoAction);
            }}
          >
            {Platform.OS === "android" ? (
              <View pointerEvents="none">
                <IconButton
                  accessibilityLabel={t("mobile.review.PullRequestMergeControls.merge-options")}
                  icon="chevron.down"
                  variant="tonal"
                />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("mobile.review.PullRequestMergeControls.merge-options")}
                className="min-h-11 w-11 items-center justify-center border-l border-border-subtle"
              >
                <SymbolView
                  name="chevron.down"
                  size={13}
                  tintColorClassName={
                    canMerge ? "accent-prominent-action-foreground" : "accent-icon-muted"
                  }
                />
              </Pressable>
            )}
          </Menu>
        ) : null}
      </View>
      {permissions.connected && reason && !hideReason ? (
        <Text className="px-1 text-xs text-foreground-muted">{reason}</Text>
      ) : null}
      {pr.autoMergeEnabled ? (
        <Text className="px-1 text-xs text-foreground-muted">
          {pr.autoMergeMethod
            ? t("pr.merge.enabledMethod", { method: t(`pr.merge.method.${pr.autoMergeMethod}`) })
            : t("pr.merge.enabled")}
        </Text>
      ) : null}
      {stack.error && stack.supportsStackActions ? (
        <Button
          label={t("mobile.review.PullRequestMergeControls.retry-stack-lookup")}
          tone="text"
          onPress={stack.refresh}
        />
      ) : null}
    </View>
  );
}
