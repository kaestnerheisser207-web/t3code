import { useTranslate } from "../../i18n";
import { PermissionChecklist, PermissionContinueButton } from "../permissions/PermissionChecklist";
import { usePermissionStatus } from "../permissions/usePermissionStatus";
import {
  isModifierPairShortcut,
  type DesktopSnapShotSetupAction,
  type DesktopSnapShotState,
} from "@t3tools/contracts";
import { useState, type ReactNode } from "react";
import { MacAccessibilityIcon, MacScreenRecordingIcon } from "../Icons";
import { CaptureShortcutConfig } from "./CaptureShortcutConfig";
import { Button } from "../ui/button";
import { Dialog, DialogDescription } from "../ui/dialog";
import { WizardSteps, WizardPopup, WizardHeader, WizardPanel, WizardFooter } from "../ui/wizard";
import {
  captureSetupAccessReady,
  captureSetupBackend,
  captureSetupCheckMessage,
  captureSetupDesktopName,
  captureSetupInitialStep,
  captureSetupShortcutReady,
  type CaptureSetupStep,
} from "./SnapShotSetupDialog.logic";

export function SnapShotSetupDialog({
  state,
  initialStep,
  wasEnabled,
  includeAccessibility,
  busy: actionBusy,
  error,
  shortcutInput,
  shortcutStatus,
  shortcutChanged,
  canSaveShortcut,
  onSaveShortcut,
  onEnable,
  onAction,
  onRefresh,
  onClose,
  onLeaveStep,
}: {
  state: DesktopSnapShotState;
  initialStep: CaptureSetupStep;
  wasEnabled: boolean;
  includeAccessibility: boolean;
  busy: boolean;
  error: string | null;
  shortcutInput: ReactNode;
  shortcutStatus: string | null | undefined;
  shortcutChanged: boolean;
  canSaveShortcut: boolean;
  onSaveShortcut: () => Promise<boolean>;
  onEnable: () => Promise<boolean>;
  onAction: (action: DesktopSnapShotSetupAction) => Promise<void>;
  onRefresh: () => Promise<DesktopSnapShotState | undefined>;
  onClose: (completed: boolean) => Promise<void>;
  onLeaveStep: () => void;
}) {
  const t = useTranslate();
  const SETUP_STEPS = [
    { id: "access", label: t("settings.extraUi.SnapShotSetupDialog.access") },
    { id: "shortcut", label: t("settings.extraUi.SnapShotSetupDialog.shortcut") },
  ] as const;

  const GNOME_ACCESS_COPY = {
    "not-installed": {
      title: t("settings.extraUi.SnapShotSetupDialog.install-the-extension"),
      description: t(
        "settings.extraUi.SnapShotSetupDialog.the-t3-code-gnome-extension-lets-you-capture-other-windows-and-bring-them-into-your-draft-sign-out-once-after-installing",
      ),
    },
    "restart-required": {
      title: t("settings.extraUi.SnapShotSetupDialog.extension-installed"),
      description: t(
        "settings.extraUi.SnapShotSetupDialog.save-your-work-then-sign-out-and-back-in-your-setup-will-be-waiting-here",
      ),
    },
    "update-required": {
      title: t("settings.extraUi.SnapShotSetupDialog.update-the-extension"),
      description: t(
        "settings.extraUi.SnapShotSetupDialog.install-the-update-then-sign-out-and-back-in",
      ),
    },
    "extensions-disabled": {
      title: t("settings.extraUi.SnapShotSetupDialog.allow-gnome-extensions"),
      description: t(
        "settings.extraUi.SnapShotSetupDialog.open-gnome-extensions-and-turn-on-extensions-then-check-again",
      ),
    },
    disabled: {
      title: t("settings.extraUi.SnapShotSetupDialog.enable-the-extension"),
      description: t(
        "settings.extraUi.SnapShotSetupDialog.enable-t3-code-snapshots-to-start-capturing-windows",
      ),
    },
    enabled: {
      title: t("settings.extraUi.SnapShotSetupDialog.capture-is-ready"),
      description: t("settings.extraUi.SnapShotSetupDialog.next-choose-your-shortcut"),
    },
    unsupported: {
      title: t("settings.extraUi.SnapShotSetupDialog.automatic-capture-isn-t-available"),
      description: t(
        "settings.extraUi.SnapShotSetupDialog.use-take-snapshot-from-the-command-palette-to-choose-a-window",
      ),
    },
    error: {
      title: t("settings.extraUi.SnapShotSetupDialog.couldn-t-set-up-the-extension"),
      description: t(
        "settings.extraUi.SnapShotSetupDialog.check-t3-code-snapshots-in-gnome-extensions-then-try-again",
      ),
    },
  };

  const [step, setStep] = useState(() => captureSetupInitialStep(state, initialStep));
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);
  const busy = actionBusy || checking || configBusy;
  const backend = captureSetupBackend(state);
  const configShortcut = backend === "niri" || backend === "hyprland";
  const desktop = captureSetupDesktopName(state);
  const extension = state.gnomeExtension;
  const helper = backend === "hyprland" ? state.hyprlandHelper : state.kdeHelper;
  const helperBackend = backend === "kde" || backend === "hyprland";
  const installHelper = backend === "hyprland" ? "install-hyprland-helper" : "install-kde-helper";
  const removeHelper = backend === "hyprland" ? "remove-hyprland-helper" : "remove-kde-helper";
  const accessReady = captureSetupAccessReady(state);
  const permissionStatus = usePermissionStatus(
    async () => {
      const refreshed = await onRefresh();
      if (!refreshed?.macPermissions)
        throw new Error(t("settings.extraUi.SnapShotSetupDialog.permission-status-unavailable"));
      return refreshed.macPermissions;
    },
    state.macPermissions ?? { screenRecording: false, accessibility: false },
    Boolean(state.macPermissions) && step === "access" && !busy,
  );
  const macPermissions = state.macPermissions ? permissionStatus.status : undefined;
  const macPermissionsReady =
    !macPermissions ||
    permissionStatus.isReady(
      includeAccessibility ? ["screenRecording", "accessibility"] : ["screenRecording"],
    );
  const shortcutReady = captureSetupShortcutReady(state, shortcutChanged);
  const install = extension?.status === "not-installed" || extension?.status === "update-required";
  const enable = extension?.status === "disabled";
  const changeStep = (next: CaptureSetupStep) => {
    onLeaveStep();
    setChecked(false);
    setStep(next);
  };
  const checkAgain = async () => {
    if (busy) return;
    setChecking(true);
    setChecked(false);
    const refreshed = await onRefresh().finally(() => setChecking(false));
    setChecked(refreshed !== undefined);
  };
  const accessCopy =
    state.message && !macPermissions
      ? {
          title: t("settings.extraUi.SnapShotSetupDialog.let-s-try-that-again"),
          description: t(
            "settings.extraUi.SnapShotSetupDialog.couldn-t-check-snapshots-try-again-to-continue",
          ),
        }
      : backend === "gnome" && extension
        ? extension.status === "enabled" && !accessReady
          ? {
              title: t("settings.extraUi.SnapShotSetupDialog.check-capture-access"),
              description: t(
                "settings.extraUi.SnapShotSetupDialog.the-extension-isn-t-ready-yet-try-again-in-a-moment",
              ),
            }
          : GNOME_ACCESS_COPY[extension.status]
        : helperBackend
          ? helper?.status === "ready"
            ? {
                title: t("settings.extraUi.SnapShotSetupDialog.capture-is-ready"),
                description: t("settings.extraUi.SnapShotSetupDialog.next-choose-your-shortcut"),
              }
            : helper?.status === "error"
              ? {
                  title: t("settings.extraUi.SnapShotSetupDialog.let-s-fix-capture-access"),
                  description: t(
                    "settings.extraUi.SnapShotSetupDialog.try-reinstalling-the-capture-helper-then-check-again",
                  ),
                }
              : {
                  title:
                    helper?.status === "update-required"
                      ? t("settings.extraUi.SnapShotSetupDialog.update-the-capture-helper")
                      : t("settings.extraUi.SnapShotSetupDialog.allow-snapshots"),
                  description: t("settings.extraUi.SnapShotSetupDialog.captureHelperDescription"),
                }
          : backend === "niri"
            ? {
                title: t("settings.extraUi.SnapShotSetupDialog.capture-is-ready"),
                description: t("settings.extraUi.SnapShotSetupDialog.next-choose-your-shortcut"),
              }
            : backend === "picker"
              ? {
                  title: t("settings.extraUi.SnapShotSetupDialog.choose-a-window-each-time"),
                  description: t(
                    "settings.extraUi.SnapShotSetupDialog.your-desktop-doesn-t-support-automatic-capture-you-ll-choose-the-window-to-capture-instead",
                  ),
                }
              : {
                  title: t("settings.extraUi.SnapShotSetupDialog.allow-snapshots"),
                  description:
                    backend === "portal"
                      ? t(
                          "settings.extraUi.SnapShotSetupDialog.your-desktop-may-ask-for-permission-when-you-first-capture",
                        )
                      : macPermissions
                        ? macPermissionsReady
                          ? t(
                              "settings.extraUi.SnapShotSetupDialog.test-a-snapshot-of-the-current-window-if-macos-asks-to-bypass-its-window-picker-choose-allow-the-test-image-is-discarded",
                            )
                          : t(
                              "settings.extraUi.SnapShotSetupDialog.allow-each-permission-then-continue",
                            )
                        : t(
                            "settings.extraUi.SnapShotSetupDialog.allow-access-when-prompted-to-start-capturing-windows",
                          ),
                };
  const title =
    step === "access"
      ? accessCopy.title
      : t("settings.extraUi.SnapShotSetupDialog.choose-your-shortcut");
  const description =
    step === "access"
      ? accessCopy.description
      : configShortcut
        ? t("settings.extraUi.SnapShotSetupDialog.click-the-shortcut-then-press-the-keys-you-want")
        : state.mode === "portal"
          ? t(
              "settings.extraUi.SnapShotSetupDialog.choose-your-keys-then-approve-the-permission-prompt-if-asked",
            )
          : t(
              "settings.extraUi.SnapShotSetupDialog.use-both-shift-keys-or-record-a-different-shortcut",
            );
  const stepIndex = SETUP_STEPS.findIndex(({ id }) => id === step);
  const details = [
    ...new Set(
      [
        error,
        ...(step === "access"
          ? [
              state.message,
              backend === "gnome" &&
              (extension?.status === "error" || extension?.status === "unsupported")
                ? extension.message
                : null,
              helperBackend && helper?.status === "error" ? helper.message : null,
            ]
          : []),
      ].filter((detail) => detail !== null),
    ),
  ];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) void onClose(false);
      }}
    >
      <WizardPopup showCloseButton={!busy}>
        <WizardHeader
          title={
            desktop
              ? t("web.dynamic.SnapShotSetupDialog.set-up-snapshots-for-param", {
                  desktop: desktop,
                })
              : t("web.dynamic.SnapShotSetupDialog.set-up-snapshots")
          }
        >
          <WizardSteps
            steps={SETUP_STEPS.map((item) => item.label)}
            currentStep={stepIndex}
            isStepDisabled={(index) => busy || index > stepIndex}
            onStepChange={(index) => {
              const next = SETUP_STEPS[index];
              if (next && next.id !== step) changeStep(next.id);
            }}
          />
        </WizardHeader>
        <WizardPanel>
          <div className="space-y-4 text-sm">
            <div className="space-y-2" aria-live="polite">
              <h3 className="flex items-center gap-2 font-medium">{title}</h3>
              <DialogDescription>{description}</DialogDescription>
            </div>
            {step === "access" ? (
              <>
                <p
                  role="status"
                  aria-atomic="true"
                  className={
                    checked && !busy && !error ? "text-xs text-muted-foreground" : "sr-only"
                  }
                >
                  {checked && !busy && !error ? captureSetupCheckMessage(state) : null}
                </p>
                {macPermissions ? (
                  <PermissionChecklist
                    busy={busy}
                    permissions={[
                      {
                        id: "screenRecording",
                        icon: <MacScreenRecordingIcon className="size-8 shrink-0 drop-shadow-sm" />,
                        title: t("settings.extraUi.SnapShotSetupDialog.screen-recording"),
                        description: t(
                          "settings.extraUi.SnapShotSetupDialog.capture-the-window-you-re-using",
                        ),
                        granted: macPermissions.screenRecording,
                        onAllow: () => void onAction("allow-screen-recording"),
                      },
                      {
                        id: "accessibility",
                        icon: <MacAccessibilityIcon className="size-8 shrink-0 drop-shadow-sm" />,
                        title: t("settings.extraUi.SnapShotSetupDialog.accessibility"),
                        description: includeAccessibility
                          ? t(
                              "settings.extraUi.SnapShotSetupDialog.include-text-and-controls-from-the-captured-app",
                            )
                          : t(
                              "settings.extraUi.SnapShotSetupDialog.optional-include-text-and-controls-from-the-captured-app",
                            ),
                        granted: macPermissions.accessibility,
                        onAllow: () => void onAction("allow-accessibility"),
                      },
                    ]}
                  />
                ) : null}
                {permissionStatus.error && macPermissions ? (
                  <p role="status" className="text-xs text-muted-foreground">
                    {permissionStatus.error}
                  </p>
                ) : null}
                {helperBackend && helper?.status === "error" ? (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onAction(installHelper)}
                  >
                    {t("settings.pages.SnapShotSetupDialog.reinstall-helper")}
                  </Button>
                ) : null}
              </>
            ) : configShortcut ? (
              <CaptureShortcutConfig
                state={state}
                disabled={actionBusy || checking || !accessReady}
                onBusyChange={setConfigBusy}
                onSaved={onRefresh}
                onComplete={() => onClose(true)}
              />
            ) : (
              <div className="space-y-3">
                {shortcutInput}
                {shortcutStatus ? (
                  <p className="text-xs text-muted-foreground" role="status">
                    {shortcutStatus}
                  </p>
                ) : null}
                {!shortcutChanged &&
                !state.shortcutRegistered &&
                !state.shortcutPending &&
                state.shortcutCanRetry !== false &&
                !isModifierPairShortcut(state.shortcut) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onAction("retry-shortcut")}
                  >
                    {state.mode === "portal"
                      ? t("web.dynamic.SnapShotSetupDialog.shortcut-permissions")
                      : t("web.dynamic.SnapShotSetupDialog.try-again")}
                  </Button>
                ) : null}
              </div>
            )}
            {step === "shortcut" && !accessReady ? (
              <p role="alert" className="text-destructive">
                {t(
                  "settings.pages.SnapShotSetupDialog.capture-needs-attention-go-back-to-check-access",
                )}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-destructive">
                {t(
                  "settings.pages.SnapShotSetupDialog.couldn-t-finish-this-step-try-again-or-check-advanced-for-help",
                )}
              </p>
            ) : null}
            {details.length > 0 || (step === "access" && (backend === "gnome" || helperBackend)) ? (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">
                  {t("settings.pages.SnapShotSetupDialog.advanced")}
                </summary>
                <div className="mt-3 space-y-3">
                  {details.map((detail) => (
                    <p key={detail} className="break-words">
                      {detail}
                    </p>
                  ))}
                  {step === "access" && (backend === "gnome" || helperBackend) ? (
                    <p>
                      {t(
                        "settings.pages.SnapShotSetupDialog.included-with-t3-code-no-download-needed",
                      )}
                    </p>
                  ) : null}
                  {step === "access" && backend === "gnome" && extension?.status === "enabled" ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onAction("disable-extension")}
                    >
                      {t("settings.pages.SnapShotSetupDialog.disable-extension")}
                    </Button>
                  ) : null}
                  {step === "access" && helperBackend && helper?.status !== "not-installed" ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onAction(removeHelper)}
                    >
                      {t("settings.pages.SnapShotSetupDialog.remove-capture-helper")}
                    </Button>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </WizardPanel>
        <WizardFooter>
          {step !== "access" ? (
            <Button variant="ghost" disabled={busy} onClick={() => changeStep("access")}>
              {t("settings.pages.SnapShotSetupDialog.back")}
            </Button>
          ) : null}
          <Button variant="ghost" disabled={busy} onClick={() => void onClose(false)}>
            {wasEnabled
              ? t("web.dynamic.SnapShotSetupDialog.close")
              : t("web.dynamic.SnapShotSetupDialog.finish-later")}
          </Button>
          {step === "access" ? (
            helperBackend && !accessReady && helper?.status !== "ready" ? (
              <Button
                disabled={busy}
                aria-busy={busy}
                onClick={() =>
                  void (helper?.status === "error" ? checkAgain() : onAction(installHelper))
                }
              >
                {checking
                  ? t("web.dynamic.SnapShotSetupDialog.checking")
                  : busy
                    ? t("web.dynamic.SnapShotSetupDialog.installing")
                    : helper?.status === "error"
                      ? t("web.dynamic.SnapShotSetupDialog.check-again")
                      : helper?.status === "update-required"
                        ? t("web.dynamic.SnapShotSetupDialog.update-helper")
                        : t("web.dynamic.SnapShotSetupDialog.install-helper")}
              </Button>
            ) : backend === "gnome" && !accessReady && extension?.status !== "enabled" ? (
              <Button
                disabled={busy}
                aria-busy={checking}
                onClick={() =>
                  void (install
                    ? onAction("install-extension")
                    : enable
                      ? onAction("enable-extension")
                      : checkAgain())
                }
              >
                {checking
                  ? t("web.dynamic.SnapShotSetupDialog.checking")
                  : busy
                    ? install
                      ? t("web.dynamic.SnapShotSetupDialog.installing")
                      : enable
                        ? t("web.dynamic.SnapShotSetupDialog.enabling")
                        : t("web.dynamic.SnapShotSetupDialog.working")
                    : install
                      ? extension?.status === "update-required"
                        ? t("web.dynamic.SnapShotSetupDialog.update-extension")
                        : t("web.dynamic.SnapShotSetupDialog.install-extension")
                      : enable
                        ? t("web.dynamic.SnapShotSetupDialog.enable-extension")
                        : t("web.dynamic.SnapShotSetupDialog.check-again")}
              </Button>
            ) : (
              <PermissionContinueButton
                ready={macPermissionsReady}
                busy={busy}
                onClick={async () => {
                  if (await onEnable()) changeStep("shortcut");
                }}
              >
                {busy
                  ? t("web.dynamic.SnapShotSetupDialog.working")
                  : macPermissions
                    ? t("web.dynamic.SnapShotSetupDialog.test-capture-and-continue")
                    : backend === "direct"
                      ? t("web.dynamic.SnapShotSetupDialog.allow-capture")
                      : !accessReady && !macPermissions
                        ? t("web.dynamic.SnapShotSetupDialog.try-again")
                        : t("web.dynamic.SnapShotSetupDialog.continue")}
              </PermissionContinueButton>
            )
          ) : !configShortcut ? (
            <Button
              disabled={
                busy || !accessReady || (shortcutChanged ? !canSaveShortcut : !shortcutReady)
              }
              onClick={async () => {
                if (!shortcutChanged || (await onSaveShortcut())) await onClose(true);
              }}
            >
              {busy
                ? t("web.dynamic.SnapShotSetupDialog.saving")
                : shortcutChanged
                  ? t("web.dynamic.SnapShotSetupDialog.save-and-finish")
                  : t("web.dynamic.SnapShotSetupDialog.done")}
            </Button>
          ) : null}
        </WizardFooter>
      </WizardPopup>
    </Dialog>
  );
}
