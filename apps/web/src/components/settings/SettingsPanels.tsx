import type { TranslationKey } from "@t3tools/client-runtime/i18n";
import { useAtomValue } from "@effect/atom-react";
import { NotificationSettings } from "./NotificationSettings";
import { LanguageSettings } from "./LanguageSettings";
import { useTranslate } from "../../i18n";
import { PRIVACY_POLICY_URL } from "../../legalLinks";
import { CheckIcon } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  type DesktopUpdateChannel,
  IDLE_COMPACTION_MODES,
  globalIdleCompaction,
  ProviderDriverKind,
  type ProviderInstanceId,
  type SidebarProjectGroupingMode,
} from "@t3tools/contracts";
import {
  DEFAULT_UNIFIED_SETTINGS,
  type DiffLayout,
  MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS,
  MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS,
  type ResponseStreamingMode,
  type QuitConfirmationMode,
  SidebarProjectSortOrder,
} from "@t3tools/contracts/settings";
import { desktopUpdateChannelOf } from "@t3tools/shared/cliRelease";
import { createModelSelection } from "@t3tools/shared/model";
import * as Equal from "effect/Equal";
import * as Schema from "effect/Schema";
import { APP_VERSION, HOSTED_APP_CHANNEL, HOSTED_APP_CHANNEL_LABEL } from "../../branding";
import { CliCommandSettingsRow } from "./CliCommandSettingsRow";
import { MobileAppSettingsRow } from "./MobileAppSettingsRow";
import {
  canCheckForUpdate,
  getDesktopUpdateButtonTooltip,
  getDesktopUpdateDisabledReason,
  getDesktopUpdateInstallConfirmationMessage,
  isDesktopUpdateButtonDisabled,
  resolveDesktopUpdateButtonAction,
} from "../../components/desktopUpdate.logic";
import { ProviderModelPicker } from "../chat/ProviderModelPicker";
import { TraitsPicker } from "../chat/TraitsPicker";
import { isElectron } from "../../env";
import { buildHostedChannelSelectionUrl, type HostedAppChannel } from "../../hostedPairing";
import {
  readAppearanceModePreference,
  readThemeHalves,
  readThemePreference,
  useTheme,
} from "../../hooks/useTheme";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "./useScopedSettings";
import { useScopedModelDisabledReason } from "./useScopedModelAvailability";
import { useOptionalSettingsScope, useSettingsScope } from "./SettingsScopeContext";
import { scopedIdleCompaction } from "./scopedSettings";
import { ProjectDefaultsSettings } from "./ProjectDefaultsSettings";
import { ThreadTitleInstructionsSettings } from "./ThreadTitleInstructionsSettings";
import { SnoozePresetsRow } from "./SnoozePresetsSettings";
import { useDesktopUpdateState } from "../../state/desktopUpdate";
import {
  getCustomModelOptionsByInstance,
  resolveAppModelSelectionState,
  selectsPlanAgent,
} from "../../modelSelection";
import { providerInstanceEntriesFor } from "../../providerInstances";
import { ensureLocalApi, readLocalApi } from "../../localApi";
import { isMacPlatform } from "../../lib/utils";
import { useEnvironmentProviders, useEnvironments } from "../../state/environments";
import { EMPTY_SERVER_PROVIDERS } from "../../state/server";
import { Button } from "../ui/button";
import { DraftInput } from "../ui/draft-input";
import { Input } from "../ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { ScopedSwitch } from "./ScopedSwitch";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  getChangedBrowserSettingLabels,
  getChangedTypographySettingLabels,
  hasChangedBackgroundActivitySettings,
  isProjectGroupingEnabled,
  projectGroupingModeFromToggle,
  readLastEnabledProjectGroupingMode,
  rememberEnabledProjectGroupingMode,
} from "./SettingsPanels.logic";
import {
  SETTINGS_PICKER_TRIGGER_CLASSNAME,
  SettingResetButton,
  SettingsPageContainer,
  SettingsRow,
  SettingsSection,
} from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { BackgroundActivitySettingsRow } from "./BackgroundActivitySettings";
import { AdvancedSettings } from "./AdvancedSettings";
import { PullRequestLinksOpenInAppSetting } from "./IntegrationsSettings";
import { StorageCleanupSections } from "./StorageSettings";
import { UpdateTrackSwitchDialog } from "./UpdateTrackSwitchDialog";
import { environmentIdsKey } from "~/state/environmentAtomList";
import { environmentSessionStatesAtom } from "~/state/session";
import { canUpdateServer } from "../ServerUpdateAction";
import { useUpdateEverythingRun } from "../sidebar/updateEverythingRun";
import { awaitsTrackSwitch, channelSwitchLabel } from "../sidebar/updateEverything.logic";
import { isHostedByThisApp } from "../sidebar/useUpdateEverything";

const RESPONSE_STREAMING_MODE_KEYS: Record<ResponseStreamingMode, TranslationKey> = {
  turn: "settings.support.wait-for-the-full-response",
  paragraph: "settings.support.show-finished-paragraphs",
};

const RESPONSE_STREAMING_MODE_DESCRIPTION_KEYS: Record<ResponseStreamingMode, TranslationKey> = {
  turn: "settings.support.text-appears-once-the-agent-finishes-its-turn",
  paragraph: "settings.support.each-paragraph-or-code-block-appears-as-soon-as-it-is-complete",
};

const SIDEBAR_PROJECT_SORT_ORDER_KEYS: Record<SidebarProjectSortOrder, TranslationKey> = {
  updated_at: "settings.support.last-user-message",
  created_at: "settings.support.created-at",
  manual: "settings.support.manual",
};
const isSidebarProjectSortOrder = Schema.is(SidebarProjectSortOrder);

const TIMESTAMP_FORMAT_KEYS = {
  locale: "settings.support.system-default",
  "12-hour": "settings.support.12-hour",
  "24-hour": "settings.support.24-hour",
} as const;

const DIFF_LAYOUT_KEYS: Record<DiffLayout, TranslationKey> = {
  stacked: "settings.support.stacked",
  split: "settings.support.split",
};

const QUIT_CONFIRMATION_MODE_KEYS: Record<QuitConfirmationMode, TranslationKey> = {
  direct: "settings.support.direct",
  hold: "settings.support.hold",
  "double-click": "settings.support.double-press",
};

const DEFAULT_DRIVER_KIND = ProviderDriverKind.make("codex");
function AboutVersionTitle() {
  const t = useTranslate();
  return (
    <span className="inline-flex items-baseline gap-2">
      <span>{t("settings.panels.AboutVersionTitle.version")}</span>
      <code className="text-2xs font-medium text-muted-foreground">{APP_VERSION}</code>
    </span>
  );
}

function AboutVersionSection() {
  const t = useTranslate();
  const updateState = useDesktopUpdateState();
  const [switchChannel, setSwitchChannel] = useState<DesktopUpdateChannel | null>(null);
  const [isUpdateActionPending, setIsUpdateActionPending] = useState(false);
  const { environments } = useEnvironments();
  const sessionStates = useAtomValue(
    environmentSessionStatesAtom(
      environmentIdsKey(environments.map(({ environmentId }) => environmentId)),
    ),
  );
  // A second run would replace the first run's progress and local download.
  const updateRun = useUpdateEverythingRun();

  const hasDesktopBridge = typeof window !== "undefined" && Boolean(window.desktopBridge);
  const selectedUpdateChannel = updateState?.channel ?? "latest";
  const selectedHostedAppChannel = hasDesktopBridge ? null : HOSTED_APP_CHANNEL;
  // A switch that failed part way leaves this app or a server on the other track.
  // With its updater off, a switch cannot move this app, so it is not counted.
  const appOffTrack =
    updateState?.enabled !== false && desktopUpdateChannelOf(APP_VERSION) !== selectedUpdateChannel;
  const unswitchedMachines =
    (appOffTrack ? 1 : 0) +
    environments.filter(
      (environment, index) =>
        environment.connection.phase === "connected" &&
        canUpdateServer(sessionStates[index]!) &&
        awaitsTrackSwitch(
          {
            serverConfig: environment.serverConfig,
            hostedByThisApp: isHostedByThisApp(environment),
          },
          selectedUpdateChannel,
        ),
    ).length;

  const handleButtonClick = async () => {
    const bridge = window.desktopBridge;
    if (!bridge) return;

    const action = updateState ? resolveDesktopUpdateButtonAction(updateState) : "none";

    if (action === "download") {
      void bridge.downloadUpdate().catch((error: unknown) => {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: t("settings.support.could-not-download-update"),
            description:
              error instanceof Error ? error.message : t("settings.support.download-failed"),
          }),
        );
      });
      return;
    }

    if (action === "install") {
      if (isUpdateActionPending) return;
      setIsUpdateActionPending(true);
      let confirmed = false;
      try {
        confirmed = await ensureLocalApi().dialogs.confirm(
          getDesktopUpdateInstallConfirmationMessage(
            updateState ?? { availableVersion: null, downloadedVersion: null },
          ),
        );
      } catch (error) {
        setIsUpdateActionPending(false);
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: t("settings.support.could-not-confirm-update"),
            description:
              error instanceof Error
                ? error.message
                : t("settings.support.update-confirmation-failed"),
          }),
        );
        return;
      }
      if (!confirmed) {
        setIsUpdateActionPending(false);
        return;
      }
      void bridge
        .installUpdate()
        .catch((error: unknown) => {
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: t("settings.support.could-not-install-update"),
              description:
                error instanceof Error ? error.message : t("settings.support.install-failed"),
            }),
          );
        })
        .finally(() => setIsUpdateActionPending(false));
      return;
    }

    if (typeof bridge.checkForUpdate !== "function") return;
    void bridge
      .checkForUpdate()
      .then((result) => {
        if (!result.checked) {
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: t("settings.support.could-not-check-for-updates"),
              description:
                result.state.message ??
                t("settings.support.automatic-updates-are-not-available-in-this-build"),
            }),
          );
        }
      })
      .catch((error: unknown) => {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: t("settings.support.could-not-check-for-updates"),
            description:
              error instanceof Error ? error.message : t("settings.support.update-check-failed"),
          }),
        );
      });
  };

  const action = updateState ? resolveDesktopUpdateButtonAction(updateState) : "none";
  const buttonTooltip = updateState ? getDesktopUpdateButtonTooltip(updateState) : null;
  const buttonDisabled =
    action === "none"
      ? !canCheckForUpdate(updateState)
      : isDesktopUpdateButtonDisabled(updateState);

  const actionLabel: Record<string, string> = {
    download: t("settings.support.download"),
    install: t("settings.support.install"),
  };
  const statusLabel: Record<string, string> = {
    checking: t("web.dynamic.SnapShotSetupDialog.checking"),
    downloading: t("settings.support.downloading"),
    // Off its track, "up to date" only means no switch is pending; Review moves it.
    ...(appOffTrack ? {} : { "up-to-date": t("settings.support.up-to-date") }),
  };
  const buttonLabel =
    actionLabel[action] ??
    statusLabel[updateState?.status ?? ""] ??
    t("settings.support.check-for-updates");
  const description =
    action === "download" || action === "install"
      ? t("settings.support.update-available")
      : (getDesktopUpdateDisabledReason(updateState) ??
        t("settings.support.current-version-of-the-application"));

  return (
    <>
      <SettingsRow
        id={searchableSetting("app-version").id}
        title={<AboutVersionTitle />}
        description={description}
        control={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={buttonDisabled || isUpdateActionPending}
                  onClick={handleButtonClick}
                >
                  {buttonLabel}
                </Button>
              }
            />
            {buttonTooltip ? <TooltipPopup>{buttonTooltip}</TooltipPopup> : null}
          </Tooltip>
        }
      />
      {hasDesktopBridge ? (
        <SettingsRow
          {...searchableSetting("update-track")}
          description={
            unswitchedMachines > 0 ? (
              <>
                {t("release3904.machines-remain", { count: unswitchedMachines })}{" "}
                {channelSwitchLabel(selectedUpdateChannel === "nightly" ? "latest" : "nightly", t)}.{" "}
                {/* The dialog moves what it can and says why it skips the rest. */}
                <Button
                  size="xs"
                  variant="link"
                  disabled={updateRun !== null}
                  onClick={() => setSwitchChannel(selectedUpdateChannel)}
                >
                  {t("release3904.review")}
                </Button>
              </>
            ) : (
              t(
                "release3904.switches-this-app-and-every-connected-machine-whose-database-the-target-release-supports",
              )
            )
          }
          control={
            <Select
              value={selectedUpdateChannel}
              onValueChange={(value) => {
                if (value !== selectedUpdateChannel) {
                  setSwitchChannel(value as DesktopUpdateChannel);
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-40"
                aria-label={t("settings.items.update-track.controlLabel")}
                disabled={switchChannel !== null || updateRun !== null}
              >
                <SelectValue>{channelSwitchLabel(selectedUpdateChannel, t)}</SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                <SelectItem hideIndicator value="latest">
                  {t("settings.items.update-track.text")}
                </SelectItem>
                <SelectItem hideIndicator value="nightly">
                  {t("settings.items.update-track.text.nightly")}
                </SelectItem>
              </SelectPopup>
            </Select>
          }
        />
      ) : selectedHostedAppChannel ? (
        <SettingsRow
          {...searchableSetting("update-track")}
          description={t(
            "settings.items.update-track.description.switches-the-hosted-app-release-channel",
          )}
          control={
            <Select
              value={selectedHostedAppChannel}
              onValueChange={(value) => {
                if (value === selectedHostedAppChannel) return;
                window.location.assign(
                  buildHostedChannelSelectionUrl({ channel: value as HostedAppChannel }),
                );
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-40"
                aria-label={t("settings.items.update-track.controlLabel")}
              >
                <SelectValue>{HOSTED_APP_CHANNEL_LABEL}</SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                <SelectItem hideIndicator value="latest">
                  {t("settings.items.update-track.text.latest")}
                </SelectItem>
                <SelectItem hideIndicator value="nightly">
                  {t("settings.items.update-track.text.nightly")}
                </SelectItem>
              </SelectPopup>
            </Select>
          }
        />
      ) : null}
      {hasDesktopBridge ? <CliCommandSettingsRow /> : null}
      {switchChannel === null ? null : (
        <UpdateTrackSwitchDialog channel={switchChannel} onClose={() => setSwitchChannel(null)} />
      )}
    </>
  );
}

export function useSettingsRestore(onRestored?: () => void) {
  const t = useTranslate();
  const {
    theme,
    setTheme,
    followSystem,
    setFollowSystem,
    setThemeHalf,
    clearThemeHalves,
    themeHalves,
  } = useTheme();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();

  const isTextGenerationModelDirty = !Equal.equals(
    settings.textGenerationModelSelection ?? null,
    DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection ?? null,
  );
  const isBackgroundActivityDirty = hasChangedBackgroundActivitySettings(settings);

  const changedSettingLabels = [
    ...(settings.languagePreference !== DEFAULT_UNIFIED_SETTINGS.languagePreference
      ? [t("language.title")]
      : []),
    ...(theme !== "system" ? [t("settings.support.theme")] : []),
    ...(!followSystem ? [t("settings.support.follow-system")] : []),
    ...(themeHalves !== null ? [t("settings.support.theme-mix")] : []),
    ...(settings.appearanceContrast !== DEFAULT_UNIFIED_SETTINGS.appearanceContrast
      ? [t("settings.support.contrast")]
      : []),
    ...(settings.glassOpacity !== DEFAULT_UNIFIED_SETTINGS.glassOpacity
      ? [t("settings.support.glass-opacity")]
      : []),
    ...(settings.diffColorScheme !== DEFAULT_UNIFIED_SETTINGS.diffColorScheme
      ? [t("settings.support.diff-colors")]
      : []),
    ...(settings.chatWidth !== DEFAULT_UNIFIED_SETTINGS.chatWidth
      ? [t("settings.support.chat-width")]
      : []),
    ...(settings.effortDisplay !== DEFAULT_UNIFIED_SETTINGS.effortDisplay
      ? [t("nightly.effortDisplay")]
      : []),
    ...(settings.mathRenderingEnabled !== DEFAULT_UNIFIED_SETTINGS.mathRenderingEnabled
      ? [t("settings.support.render-math")]
      : []),
    ...(settings.panelAnimationDurationMs !== DEFAULT_UNIFIED_SETTINGS.panelAnimationDurationMs
      ? [t("settings.support.panel-animations")]
      : []),
    ...(settings.environmentIdentificationMode !==
    DEFAULT_UNIFIED_SETTINGS.environmentIdentificationMode
      ? [t("settings.support.environment-identification")]
      : []),
    ...(settings.timestampFormat !== DEFAULT_UNIFIED_SETTINGS.timestampFormat
      ? [t("settings.support.time-format")]
      : []),
    ...(settings.notificationMode !== DEFAULT_UNIFIED_SETTINGS.notificationMode
      ? [t("settings.support.thread-notifications")]
      : []),
    ...(settings.inAppNotificationsEnabled !== DEFAULT_UNIFIED_SETTINGS.inAppNotificationsEnabled
      ? [t("settings.support.in-app-notifications")]
      : []),
    ...(settings.sidebarProjectGroupingMode !== DEFAULT_UNIFIED_SETTINGS.sidebarProjectGroupingMode
      ? [t("settings.support.project-grouping")]
      : []),
    ...(settings.sidebarProjectSortOrder !== DEFAULT_UNIFIED_SETTINGS.sidebarProjectSortOrder
      ? [t("settings.support.project-order")]
      : []),
    ...(settings.sidebarWorkingShelfEnabled !== DEFAULT_UNIFIED_SETTINGS.sidebarWorkingShelfEnabled
      ? [t("settings.support.working-section")]
      : []),
    ...(settings.sidebarAutoSettleAfterDays !== DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays
      ? [t("settings.support.auto-settle-inactive-threads")]
      : []),
    ...(settings.sidebarAutoSettleKeepPullRequests !==
    DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleKeepPullRequests
      ? [t("settings.support.keep-threads-with-a-pr")]
      : []),
    ...(settings.sidebarAutoSettleOnMerge !== DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleOnMerge
      ? [t("settings.support.auto-settle-merged-threads")]
      : []),
    ...(settings.autoResumeLimitedThreads !== DEFAULT_UNIFIED_SETTINGS.autoResumeLimitedThreads
      ? [t("settings.support.resume-after-usage-limits")]
      : []),
    ...(settings.snoozeLimitedThreads !== DEFAULT_UNIFIED_SETTINGS.snoozeLimitedThreads
      ? [t("settings.support.snooze-until-limits-reset")]
      : []),
    ...(!Equal.equals(settings.snoozePresets, DEFAULT_UNIFIED_SETTINGS.snoozePresets)
      ? [t("settings.support.snooze-options")]
      : []),
    ...(settings.wordWrap !== DEFAULT_UNIFIED_SETTINGS.wordWrap
      ? [t("settings.support.word-wrap")]
      : []),
    ...(settings.persistComposerContextStrip !==
    DEFAULT_UNIFIED_SETTINGS.persistComposerContextStrip
      ? [t("settings.support.composer-context")]
      : []),
    ...getChangedTypographySettingLabels(settings, t),
    ...(settings.diffFilesCollapsed !== DEFAULT_UNIFIED_SETTINGS.diffFilesCollapsed
      ? [t("settings.support.default-diff-file-state")]
      : []),
    ...(settings.diffIgnoreWhitespace !== DEFAULT_UNIFIED_SETTINGS.diffIgnoreWhitespace
      ? [t("settings.support.diff-whitespace-changes")]
      : []),
    ...(settings.diffLayout !== DEFAULT_UNIFIED_SETTINGS.diffLayout
      ? [t("settings.support.diff-layout")]
      : []),
    ...(settings.proactivePanelsEnabled !== DEFAULT_UNIFIED_SETTINGS.proactivePanelsEnabled
      ? [t("settings.support.proactive-panels")]
      : []),
    ...(settings.showSkillsInSlashMenu !== DEFAULT_UNIFIED_SETTINGS.showSkillsInSlashMenu
      ? [t("settings.support.show-skills-in-slash-menu")]
      : []),
    ...(settings.composerRichTextEnabled !== DEFAULT_UNIFIED_SETTINGS.composerRichTextEnabled
      ? [t("settings.support.rich-text-composer")]
      : []),
    ...(settings.sendShortcut !== DEFAULT_UNIFIED_SETTINGS.sendShortcut
      ? [t("settings.support.send-shortcut")]
      : []),
    ...(settings.followUpBehavior !== DEFAULT_UNIFIED_SETTINGS.followUpBehavior
      ? [t("settings.support.follow-up-behavior")]
      : []),
    ...(settings.contextWindowMeterEnabled !== DEFAULT_UNIFIED_SETTINGS.contextWindowMeterEnabled
      ? [t("settings.support.context-window-indicator")]
      : []),
    ...(settings.responseStreamingMode !== DEFAULT_UNIFIED_SETTINGS.responseStreamingMode
      ? [t("settings.support.response-streaming")]
      : []),
    ...(settings.enableProviderUpdateChecks !== DEFAULT_UNIFIED_SETTINGS.enableProviderUpdateChecks
      ? [t("settings.support.provider-update-checks")]
      : []),
    ...(settings.continueThreadsAfterServerUpdate !==
    DEFAULT_UNIFIED_SETTINGS.continueThreadsAfterServerUpdate
      ? [t("settings.support.continue-threads-after-restarts")]
      : []),
    ...(isBackgroundActivityDirty ? [t("settings.support.background-activity")] : []),
    ...(settings.defaultThreadEnvMode !== DEFAULT_UNIFIED_SETTINGS.defaultThreadEnvMode
      ? [t("settings.support.new-thread-mode")]
      : []),
    ...(settings.newWorktreesStartFromOrigin !==
    DEFAULT_UNIFIED_SETTINGS.newWorktreesStartFromOrigin
      ? [t("settings.support.new-worktrees-start-from-remote")]
      : []),
    ...(settings.addProjectBaseDirectory !== DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory
      ? [t("settings.support.add-project-base-directory")]
      : []),
    ...(settings.confirmThreadUnpin !== DEFAULT_UNIFIED_SETTINGS.confirmThreadUnpin
      ? [t("settings.support.unpin-confirmation")]
      : []),
    ...(settings.confirmThreadArchive !== DEFAULT_UNIFIED_SETTINGS.confirmThreadArchive
      ? [t("settings.support.archive-confirmation")]
      : []),
    ...(settings.confirmThreadDelete !== DEFAULT_UNIFIED_SETTINGS.confirmThreadDelete
      ? [t("settings.support.delete-confirmation")]
      : []),
    ...(settings.confirmQuit !== DEFAULT_UNIFIED_SETTINGS.confirmQuit
      ? [t("settings.support.quit-shortcut")]
      : []),
    ...(isTextGenerationModelDirty ? [t("settings.support.text-generation-model")] : []),
    ...(settings.threadTitleInstructions !== DEFAULT_UNIFIED_SETTINGS.threadTitleInstructions
      ? [t("settings.support.thread-title-instructions")]
      : []),
    ...getChangedBrowserSettingLabels(settings, t),
    ...(settings.enableAgentBrowserAccess !== DEFAULT_UNIFIED_SETTINGS.enableAgentBrowserAccess
      ? [t("settings.support.agent-browser-access")]
      : []),
  ];

  const restoreDefaults = async () => {
    if (changedSettingLabels.length === 0) return;
    const api = readLocalApi();
    const confirmed = await (api ?? ensureLocalApi()).dialogs.confirm(
      [
        t("settings.support.restore-default-settings"),
        t("settings.restore.description", { settings: changedSettingLabels.join(", ") }),
      ].join("\n"),
      { variant: "destructive" },
    );
    if (!confirmed) return;

    // Reset only dirty theme keys so storage failures cannot block other settings; re-read after confirmation
    // for safe rollback.
    let previousTheme = theme;
    try {
      previousTheme = readThemePreference();
    } catch {}
    const liveHalves = readThemeHalves();
    const needsThemeReset = previousTheme !== "system";
    const needsMixReset = liveHalves !== null;
    const needsFollowSystemReset = readAppearanceModePreference(previousTheme) !== "system";
    const notifyThemeRestoreFailure = () => {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: t("settings.support.couldn-t-restore-theme-settings"),
          description: t("settings.support.try-again"),
        }),
      );
    };
    // Restore the base preference before the mix because restoring the base clears the mix.
    const previousHalves = liveHalves;
    const rollbackThemeState = () => {
      if (needsThemeReset) setTheme(previousTheme);
      if (previousHalves?.light) setThemeHalf("light", previousHalves.light);
      if (previousHalves?.dark) setThemeHalf("dark", previousHalves.dark);
    };
    if (needsThemeReset && !setTheme("system")) {
      notifyThemeRestoreFailure();
      return;
    }
    if (needsMixReset && !clearThemeHalves()) {
      rollbackThemeState();
      notifyThemeRestoreFailure();
      return;
    }
    if (needsFollowSystemReset && !setFollowSystem(true)) {
      rollbackThemeState();
      notifyThemeRestoreFailure();
      return;
    }
    updateSettings({
      appearanceContrast: DEFAULT_UNIFIED_SETTINGS.appearanceContrast,
      languagePreference: DEFAULT_UNIFIED_SETTINGS.languagePreference,
      diffColorScheme: DEFAULT_UNIFIED_SETTINGS.diffColorScheme,
      chatWidth: DEFAULT_UNIFIED_SETTINGS.chatWidth,
      effortDisplay: DEFAULT_UNIFIED_SETTINGS.effortDisplay,
      mathRenderingEnabled: DEFAULT_UNIFIED_SETTINGS.mathRenderingEnabled,
      timestampFormat: DEFAULT_UNIFIED_SETTINGS.timestampFormat,
      notificationMode: DEFAULT_UNIFIED_SETTINGS.notificationMode,
      inAppNotificationsEnabled: DEFAULT_UNIFIED_SETTINGS.inAppNotificationsEnabled,
      wordWrap: DEFAULT_UNIFIED_SETTINGS.wordWrap,
      persistComposerContextStrip: DEFAULT_UNIFIED_SETTINGS.persistComposerContextStrip,
      diffFilesCollapsed: DEFAULT_UNIFIED_SETTINGS.diffFilesCollapsed,
      diffIgnoreWhitespace: DEFAULT_UNIFIED_SETTINGS.diffIgnoreWhitespace,
      diffLayout: DEFAULT_UNIFIED_SETTINGS.diffLayout,
      proactivePanelsEnabled: DEFAULT_UNIFIED_SETTINGS.proactivePanelsEnabled,
      showSkillsInSlashMenu: DEFAULT_UNIFIED_SETTINGS.showSkillsInSlashMenu,
      composerRichTextEnabled: DEFAULT_UNIFIED_SETTINGS.composerRichTextEnabled,
      sendShortcut: DEFAULT_UNIFIED_SETTINGS.sendShortcut,
      followUpBehavior: DEFAULT_UNIFIED_SETTINGS.followUpBehavior,
      contextWindowMeterEnabled: DEFAULT_UNIFIED_SETTINGS.contextWindowMeterEnabled,
      environmentIdentificationMode: DEFAULT_UNIFIED_SETTINGS.environmentIdentificationMode,
      glassOpacity: DEFAULT_UNIFIED_SETTINGS.glassOpacity,
      panelAnimationDurationMs: DEFAULT_UNIFIED_SETTINGS.panelAnimationDurationMs,
      sidebarProjectGroupingMode: DEFAULT_UNIFIED_SETTINGS.sidebarProjectGroupingMode,
      sidebarProjectSortOrder: DEFAULT_UNIFIED_SETTINGS.sidebarProjectSortOrder,
      sidebarWorkingShelfEnabled: DEFAULT_UNIFIED_SETTINGS.sidebarWorkingShelfEnabled,
      sidebarAutoSettleAfterDays: DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays,
      sidebarAutoSettleKeepPullRequests: DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleKeepPullRequests,
      sidebarAutoSettleOnMerge: DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleOnMerge,
      autoResumeLimitedThreads: DEFAULT_UNIFIED_SETTINGS.autoResumeLimitedThreads,
      snoozeLimitedThreads: DEFAULT_UNIFIED_SETTINGS.snoozeLimitedThreads,
      snoozePresets: DEFAULT_UNIFIED_SETTINGS.snoozePresets,
      responseStreamingMode: DEFAULT_UNIFIED_SETTINGS.responseStreamingMode,
      enableProviderUpdateChecks: DEFAULT_UNIFIED_SETTINGS.enableProviderUpdateChecks,
      continueThreadsAfterServerUpdate: DEFAULT_UNIFIED_SETTINGS.continueThreadsAfterServerUpdate,
      backgroundActivity: DEFAULT_UNIFIED_SETTINGS.backgroundActivity,
      backgroundActivityProfile: DEFAULT_UNIFIED_SETTINGS.backgroundActivityProfile,
      automaticGitFetchInterval: DEFAULT_UNIFIED_SETTINGS.automaticGitFetchInterval,
      providerHealthRefreshInterval: DEFAULT_UNIFIED_SETTINGS.providerHealthRefreshInterval,
      defaultThreadEnvMode: DEFAULT_UNIFIED_SETTINGS.defaultThreadEnvMode,
      newWorktreesStartFromOrigin: DEFAULT_UNIFIED_SETTINGS.newWorktreesStartFromOrigin,
      addProjectBaseDirectory: DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory,
      confirmThreadArchive: DEFAULT_UNIFIED_SETTINGS.confirmThreadArchive,
      confirmThreadDelete: DEFAULT_UNIFIED_SETTINGS.confirmThreadDelete,
      confirmThreadUnpin: DEFAULT_UNIFIED_SETTINGS.confirmThreadUnpin,
      confirmQuit: DEFAULT_UNIFIED_SETTINGS.confirmQuit,
      textGenerationModelSelection: DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection,
      threadTitleInstructions: DEFAULT_UNIFIED_SETTINGS.threadTitleInstructions,
      fontFamilySans: DEFAULT_UNIFIED_SETTINGS.fontFamilySans,
      fontFamilyComposer: DEFAULT_UNIFIED_SETTINGS.fontFamilyComposer,
      fontFamilyCode: DEFAULT_UNIFIED_SETTINGS.fontFamilyCode,
      fontFamilyTerminal: DEFAULT_UNIFIED_SETTINGS.fontFamilyTerminal,
      fontSizeInterface: DEFAULT_UNIFIED_SETTINGS.fontSizeInterface,
      fontSizePrompt: DEFAULT_UNIFIED_SETTINGS.fontSizePrompt,
      fontSizeCode: DEFAULT_UNIFIED_SETTINGS.fontSizeCode,
      fontSizeTerminal: DEFAULT_UNIFIED_SETTINGS.fontSizeTerminal,
      browserDefaultViewport: DEFAULT_UNIFIED_SETTINGS.browserDefaultViewport,
      browserDefaultZoomFactor: DEFAULT_UNIFIED_SETTINGS.browserDefaultZoomFactor,
      browserDefaultAppearance: DEFAULT_UNIFIED_SETTINGS.browserDefaultAppearance,
      browserRecordingFrameRate: DEFAULT_UNIFIED_SETTINGS.browserRecordingFrameRate,
      browserRecordingShowKeyPresses: DEFAULT_UNIFIED_SETTINGS.browserRecordingShowKeyPresses,
      browserRecordingShowMousePresses: DEFAULT_UNIFIED_SETTINGS.browserRecordingShowMousePresses,
      browserLinkTarget: DEFAULT_UNIFIED_SETTINGS.browserLinkTarget,
      browserSearchEngine: DEFAULT_UNIFIED_SETTINGS.browserSearchEngine,
      browserCustomSearchUrl: DEFAULT_UNIFIED_SETTINGS.browserCustomSearchUrl,
      browserAutoShowFloatingPreview: DEFAULT_UNIFIED_SETTINGS.browserAutoShowFloatingPreview,
      pullRequestLinksOpenInApp: DEFAULT_UNIFIED_SETTINGS.pullRequestLinksOpenInApp,
      enableAgentBrowserAccess: DEFAULT_UNIFIED_SETTINGS.enableAgentBrowserAccess,
    });
    onRestored?.();
  };

  return {
    changedSettingLabels,
    restoreDefaults,
  };
}

const AUTO_SETTLE_DEFAULT_DAYS = DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays ?? 3;

function AutoSettleDaysInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (days: number) => void;
}) {
  const t = useTranslate();
  const [draft, setDraft] = useState(String(value));
  const [draftSource, setDraftSource] = useState(value);
  if (draftSource !== value) {
    setDraftSource(value);
    setDraft(String(value));
  }

  return (
    <Input
      size="sm"
      type="number"
      min={MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS}
      max={MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS}
      className="w-full sm:w-24"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = Number(event.target.value);
        if (
          Number.isInteger(parsed) &&
          parsed >= MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS &&
          parsed <= MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS
        ) {
          onCommit(parsed);
        }
      }}
      onBlur={() => setDraft(String(value))}
      aria-label={t("settings.panels.AutoSettleDaysInput.days-of-inactivity-before-auto-settle")}
    />
  );
}

export function LegacyFeaturesSection() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();

  return (
    <SettingsSection id="legacy-features" title={t("settings.panels.LegacyFeaturesSection.legacy")}>
      <SettingsRow
        {...searchableSetting("legacy-plan-mode")}
        description={t("settings.items.legacy-plan-mode.description")}
        control={
          <Switch
            checked={settings.planModeEnabled}
            onCheckedChange={(checked) => {
              updateSettings({ planModeEnabled: Boolean(checked) });
            }}
            aria-label={t("settings.items.legacy-plan-mode.controlLabel")}
          />
        }
      />
      <SettingsRow
        {...searchableSetting("legacy-context-window-indicator")}
        description={t("settings.items.legacy-context-window-indicator.description")}
        control={
          <Switch
            checked={settings.contextWindowMeterEnabled}
            onCheckedChange={(checked) =>
              updateSettings({ contextWindowMeterEnabled: Boolean(checked) })
            }
            aria-label={t("settings.items.legacy-context-window-indicator.controlLabel")}
          />
        }
      />
    </SettingsSection>
  );
}

export function GeneralSettingsPanel() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const lastEnabledProjectGroupingMode = useRef<SidebarProjectGroupingMode>(
    readLastEnabledProjectGroupingMode(),
  );

  return (
    <SettingsPageContainer>
      <SettingsSection
        id="notifications"
        title={t("settings.panels.GeneralSettingsPanel.notifications")}
      >
        <NotificationSettings />
        <SettingsRow
          {...searchableSetting("in-app-notifications")}
          description={t("settings.items.in-app-notifications.description")}
          control={
            <Switch
              checked={settings.inAppNotificationsEnabled}
              onCheckedChange={(checked) => updateSettings({ inAppNotificationsEnabled: checked })}
              aria-label={t("settings.items.in-app-notifications.controlLabel")}
            />
          }
        />
      </SettingsSection>

      <SettingsSection id="sidebar" title={t("settings.panels.GeneralSettingsPanel.sidebar")}>
        <SettingsRow
          {...searchableSetting("project-grouping")}
          description={t("settings.items.project-grouping.description")}
          resetAction={
            settings.sidebarProjectGroupingMode !==
            DEFAULT_UNIFIED_SETTINGS.sidebarProjectGroupingMode ? (
              <SettingResetButton
                label={t("settings.items.project-grouping.resetLabel")}
                onClick={() =>
                  updateSettings({
                    sidebarProjectGroupingMode: DEFAULT_UNIFIED_SETTINGS.sidebarProjectGroupingMode,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={isProjectGroupingEnabled(settings.sidebarProjectGroupingMode)}
              onCheckedChange={(checked) => {
                if (!checked && settings.sidebarProjectGroupingMode !== "separate") {
                  lastEnabledProjectGroupingMode.current = settings.sidebarProjectGroupingMode;
                  rememberEnabledProjectGroupingMode(settings.sidebarProjectGroupingMode);
                }
                updateSettings({
                  sidebarProjectGroupingMode: projectGroupingModeFromToggle(
                    checked,
                    lastEnabledProjectGroupingMode.current,
                  ),
                });
              }}
              aria-label={t("settings.items.project-grouping.controlLabel")}
            />
          }
        />
        <SettingsRow
          {...searchableSetting("project-order")}
          description={t("settings.items.project-order.description")}
          resetAction={
            settings.sidebarProjectSortOrder !==
            DEFAULT_UNIFIED_SETTINGS.sidebarProjectSortOrder ? (
              <SettingResetButton
                label={t("settings.items.project-order.resetLabel")}
                onClick={() =>
                  updateSettings({
                    sidebarProjectSortOrder: DEFAULT_UNIFIED_SETTINGS.sidebarProjectSortOrder,
                  })
                }
              />
            ) : null
          }
          control={
            <Select
              value={settings.sidebarProjectSortOrder}
              onValueChange={(value) => {
                if (isSidebarProjectSortOrder(value)) {
                  updateSettings({ sidebarProjectSortOrder: value });
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-44"
                aria-label={t("settings.items.project-order.controlLabel")}
              >
                <SelectValue>
                  {t(SIDEBAR_PROJECT_SORT_ORDER_KEYS[settings.sidebarProjectSortOrder])}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                {SidebarProjectSortOrder.literals.map((sortOrder) => (
                  <SelectItem hideIndicator key={sortOrder} value={sortOrder}>
                    {t(SIDEBAR_PROJECT_SORT_ORDER_KEYS[sortOrder])}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          }
        />
        <SettingsRow
          {...searchableSetting("working-shelf")}
          description={t("settings.items.working-shelf.description")}
          resetAction={
            settings.sidebarWorkingShelfEnabled !==
            DEFAULT_UNIFIED_SETTINGS.sidebarWorkingShelfEnabled ? (
              <SettingResetButton
                label={t("settings.items.working-shelf.resetLabel")}
                onClick={() =>
                  updateSettings({
                    sidebarWorkingShelfEnabled: DEFAULT_UNIFIED_SETTINGS.sidebarWorkingShelfEnabled,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.sidebarWorkingShelfEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ sidebarWorkingShelfEnabled: Boolean(checked) })
              }
              aria-label={t("settings.items.working-shelf.controlLabel")}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        id="confirmations"
        title={t("settings.panels.GeneralSettingsPanel.confirmations")}
      >
        <SettingsRow
          {...searchableSetting("unpin-confirmation")}
          description={t("settings.items.unpin-confirmation.description")}
          resetAction={
            settings.confirmThreadUnpin !== DEFAULT_UNIFIED_SETTINGS.confirmThreadUnpin ? (
              <SettingResetButton
                label={t("settings.items.unpin-confirmation.resetLabel")}
                onClick={() =>
                  updateSettings({
                    confirmThreadUnpin: DEFAULT_UNIFIED_SETTINGS.confirmThreadUnpin,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.confirmThreadUnpin}
              onCheckedChange={(checked) =>
                updateSettings({ confirmThreadUnpin: Boolean(checked) })
              }
              aria-label={t("settings.items.unpin-confirmation.controlLabel")}
            />
          }
        />
        <SettingsRow
          {...searchableSetting("archive-confirmation")}
          description={t("settings.items.archive-confirmation.description")}
          resetAction={
            settings.confirmThreadArchive !== DEFAULT_UNIFIED_SETTINGS.confirmThreadArchive ? (
              <SettingResetButton
                label={t("settings.items.archive-confirmation.resetLabel")}
                onClick={() =>
                  updateSettings({
                    confirmThreadArchive: DEFAULT_UNIFIED_SETTINGS.confirmThreadArchive,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.confirmThreadArchive}
              onCheckedChange={(checked) =>
                updateSettings({ confirmThreadArchive: Boolean(checked) })
              }
              aria-label={t("settings.items.archive-confirmation.controlLabel")}
            />
          }
        />
        <SettingsRow
          {...searchableSetting("delete-confirmation")}
          description={t("settings.items.delete-confirmation.description")}
          resetAction={
            settings.confirmThreadDelete !== DEFAULT_UNIFIED_SETTINGS.confirmThreadDelete ? (
              <SettingResetButton
                label={t("settings.items.delete-confirmation.resetLabel")}
                onClick={() =>
                  updateSettings({
                    confirmThreadDelete: DEFAULT_UNIFIED_SETTINGS.confirmThreadDelete,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.confirmThreadDelete}
              onCheckedChange={(checked) =>
                updateSettings({ confirmThreadDelete: Boolean(checked) })
              }
              aria-label={t("settings.items.delete-confirmation.controlLabel")}
            />
          }
        />
        {isElectron ? (
          <SettingsRow
            {...searchableSetting("quit-confirmation")}
            description={t("settings.items.quit-confirmation.description")}
            resetAction={
              settings.confirmQuit !== DEFAULT_UNIFIED_SETTINGS.confirmQuit ? (
                <SettingResetButton
                  label={t("settings.items.quit-confirmation.resetLabel")}
                  onClick={() =>
                    updateSettings({ confirmQuit: DEFAULT_UNIFIED_SETTINGS.confirmQuit })
                  }
                />
              ) : null
            }
            control={
              <Select
                value={settings.confirmQuit}
                onValueChange={(value) => {
                  if (value === "direct" || value === "hold" || value === "double-click") {
                    updateSettings({ confirmQuit: value });
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full sm:w-40"
                  aria-label={t("settings.items.quit-confirmation.controlLabel")}
                >
                  <SelectValue>{t(QUIT_CONFIRMATION_MODE_KEYS[settings.confirmQuit])}</SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  {Object.entries(QUIT_CONFIRMATION_MODE_KEYS).map(([value, labelKey]) => (
                    <SelectItem hideIndicator key={value} value={value}>
                      {t(labelKey)}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            }
          />
        ) : null}
      </SettingsSection>

      <SettingsSection id="display" title={t("settings.panels.GeneralSettingsPanel.display")}>
        <LanguageSettings />
        <SettingsRow
          {...searchableSetting("time-format")}
          description={t("settings.items.time-format.description")}
          resetAction={
            settings.timestampFormat !== DEFAULT_UNIFIED_SETTINGS.timestampFormat ? (
              <SettingResetButton
                label={t("settings.items.time-format.resetLabel")}
                onClick={() =>
                  updateSettings({
                    timestampFormat: DEFAULT_UNIFIED_SETTINGS.timestampFormat,
                  })
                }
              />
            ) : null
          }
          control={
            <Select
              value={settings.timestampFormat}
              onValueChange={(value) => {
                if (value === "locale" || value === "12-hour" || value === "24-hour") {
                  updateSettings({ timestampFormat: value });
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-40"
                aria-label={t("settings.items.time-format.controlLabel")}
              >
                <SelectValue>{t(TIMESTAMP_FORMAT_KEYS[settings.timestampFormat])}</SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                <SelectItem hideIndicator value="locale">
                  {t(TIMESTAMP_FORMAT_KEYS.locale)}
                </SelectItem>
                <SelectItem hideIndicator value="12-hour">
                  {t(TIMESTAMP_FORMAT_KEYS["12-hour"])}
                </SelectItem>
                <SelectItem hideIndicator value="24-hour">
                  {t(TIMESTAMP_FORMAT_KEYS["24-hour"])}
                </SelectItem>
              </SelectPopup>
            </Select>
          }
        />
      </SettingsSection>
    </SettingsPageContainer>
  );
}

export function ChatSettingsPanel() {
  const t = useTranslate();
  const modifierLabel = isMacPlatform(navigator.platform) ? "⌘" : t("chat.dynamic.ctrl");
  const sendShortcutOptions = [
    { value: "enter", label: "Enter" },
    {
      value: "mod-enter-multiline",
      label: t("settings.shortcuts.multiline", { modifier: modifierLabel }),
    },
    { value: "mod-enter", label: t("settings.shortcuts.always", { modifier: modifierLabel }) },
  ] as const;
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();

  return (
    <SettingsPageContainer>
      <SettingsSection id="composer" title={t("settings.panels.ChatSettingsPanel.composer")}>
        <SettingsRow
          {...searchableSetting("composer-rich-text")}
          description={t("settings.items.composer-rich-text.description")}
          resetAction={
            settings.composerRichTextEnabled !==
            DEFAULT_UNIFIED_SETTINGS.composerRichTextEnabled ? (
              <SettingResetButton
                label={t("settings.items.composer-rich-text.resetLabel")}
                onClick={() =>
                  updateSettings({
                    composerRichTextEnabled: DEFAULT_UNIFIED_SETTINGS.composerRichTextEnabled,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.composerRichTextEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ composerRichTextEnabled: Boolean(checked) })
              }
              aria-label={t("settings.items.composer-rich-text.controlLabel")}
            />
          }
        />
        <SettingsRow
          {...searchableSetting("send-shortcut")}
          description={t("settings.items.send-shortcut.description")}
          resetAction={
            settings.sendShortcut !== DEFAULT_UNIFIED_SETTINGS.sendShortcut ? (
              <SettingResetButton
                label={t("settings.items.send-shortcut.resetLabel")}
                onClick={() =>
                  updateSettings({ sendShortcut: DEFAULT_UNIFIED_SETTINGS.sendShortcut })
                }
              />
            ) : null
          }
          control={
            <Select
              value={settings.sendShortcut}
              onValueChange={(value) => {
                const option = sendShortcutOptions.find((option) => option.value === value);
                if (option) updateSettings({ sendShortcut: option.value });
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-auto min-w-0 max-w-full"
                aria-label={t("settings.items.send-shortcut.controlLabel")}
              >
                <SelectValue>
                  {
                    sendShortcutOptions.find((option) => option.value === settings.sendShortcut)
                      ?.label
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                {sendShortcutOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center justify-between gap-4">
                      {option.label}
                      {settings.sendShortcut === option.value && <CheckIcon aria-hidden="true" />}
                    </span>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          }
        />
        <AdvancedSettings targetIds={[searchableSetting("skills-in-slash-menu").id]}>
          <SettingsRow
            {...searchableSetting("skills-in-slash-menu")}
            description={t("settings.items.skills-in-slash-menu.description")}
            resetAction={
              settings.showSkillsInSlashMenu !== DEFAULT_UNIFIED_SETTINGS.showSkillsInSlashMenu ? (
                <SettingResetButton
                  label={t("settings.items.skills-in-slash-menu.resetLabel")}
                  onClick={() =>
                    updateSettings({
                      showSkillsInSlashMenu: DEFAULT_UNIFIED_SETTINGS.showSkillsInSlashMenu,
                    })
                  }
                />
              ) : null
            }
            control={
              <Switch
                checked={settings.showSkillsInSlashMenu}
                onCheckedChange={(checked) =>
                  updateSettings({ showSkillsInSlashMenu: Boolean(checked) })
                }
                aria-label={t("settings.items.skills-in-slash-menu.controlLabel")}
              />
            }
          />
        </AdvancedSettings>
      </SettingsSection>

      <SettingsSection id="follow-ups" title={t("settings.panels.ChatSettingsPanel.follow-ups")}>
        <SettingsRow
          {...searchableSetting("follow-up-behavior")}
          description={
            t("settings.followUps.description") +
            " " +
            (settings.sendShortcut === "mod-enter-multiline"
              ? t("settings.shortcuts.reverseMultiline", { modifier: modifierLabel })
              : t("settings.shortcuts.reverseSingle", {
                  shortcut: `${modifierLabel}${settings.sendShortcut === "mod-enter" ? " + Shift" : ""}`,
                }))
          }
          resetAction={
            settings.followUpBehavior !== DEFAULT_UNIFIED_SETTINGS.followUpBehavior ? (
              <SettingResetButton
                label={t("settings.items.follow-up-behavior.resetLabel")}
                onClick={() =>
                  updateSettings({
                    followUpBehavior: DEFAULT_UNIFIED_SETTINGS.followUpBehavior,
                  })
                }
              />
            ) : null
          }
          control={
            <Select
              value={settings.followUpBehavior}
              onValueChange={(value) => {
                if (value === "queue" || value === "steer") {
                  updateSettings({ followUpBehavior: value });
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-auto min-w-0"
                aria-label={t("settings.items.follow-up-behavior.controlLabel")}
              >
                <SelectValue>
                  {settings.followUpBehavior === "queue"
                    ? t("settings.support.queue")
                    : t("settings.support.steer")}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                <SelectItem value="queue">{t("settings.items.follow-up-behavior.text")}</SelectItem>
                <SelectItem value="steer">
                  {t("settings.items.follow-up-behavior.text.steer")}
                </SelectItem>
              </SelectPopup>
            </Select>
          }
        />
      </SettingsSection>
    </SettingsPageContainer>
  );
}

function DiffColorsSettingsRow() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      {...searchableSetting("diff-color-scheme")}
      description={t("settings.items.diff-color-scheme.description")}
      resetAction={
        settings.diffColorScheme !== DEFAULT_UNIFIED_SETTINGS.diffColorScheme ? (
          <SettingResetButton
            label={t("settings.items.diff-color-scheme.resetLabel")}
            onClick={() =>
              updateSettings({ diffColorScheme: DEFAULT_UNIFIED_SETTINGS.diffColorScheme })
            }
          />
        ) : null
      }
      control={
        <div className="w-full sm:w-40">
          <Select
            value={settings.diffColorScheme}
            onValueChange={(value) => {
              if (value === "red-green" || value === "blue-orange")
                updateSettings({ diffColorScheme: value });
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-full min-w-0"
              aria-label={t("settings.items.diff-color-scheme.controlLabel")}
            >
              <span
                aria-hidden="true"
                className={
                  settings.diffColorScheme === "blue-orange"
                    ? "flex shrink-0 flex-row-reverse gap-1"
                    : "flex shrink-0 gap-1"
                }
              >
                <span className="size-2 rounded-full bg-diff-deletion" />
                <span className="size-2 rounded-full bg-diff-addition" />
              </span>
              <SelectValue>
                {settings.diffColorScheme === "blue-orange"
                  ? t("settings.support.blue-orange")
                  : t("settings.support.red-green")}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup align="end" alignItemWithTrigger={false}>
              <SelectItem value="red-green">
                {t("settings.items.diff-color-scheme.text")}
              </SelectItem>
              <SelectItem value="blue-orange">
                {t("settings.items.diff-color-scheme.text.blue-orange")}
              </SelectItem>
            </SelectPopup>
          </Select>
        </div>
      }
    />
  );
}

export function DiffsSettingsPanel() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();

  return (
    <SettingsPageContainer>
      <SettingsSection id="diffs" title={t("settings.panels.DiffsSettingsPanel.diffs")}>
        <SettingsRow
          {...searchableSetting("diff-layout")}
          description={t("settings.items.diff-layout.description")}
          resetAction={
            settings.diffLayout !== DEFAULT_UNIFIED_SETTINGS.diffLayout ? (
              <SettingResetButton
                label={t("settings.items.diff-layout.resetLabel")}
                onClick={() => updateSettings({ diffLayout: DEFAULT_UNIFIED_SETTINGS.diffLayout })}
              />
            ) : null
          }
          control={
            <Select
              value={settings.diffLayout}
              onValueChange={(value) => {
                if (value === "stacked" || value === "split") {
                  updateSettings({ diffLayout: value });
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-40"
                aria-label={t("settings.items.diff-layout.controlLabel")}
              >
                <SelectValue>{t(DIFF_LAYOUT_KEYS[settings.diffLayout])}</SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                <SelectItem hideIndicator value="stacked">
                  {t(DIFF_LAYOUT_KEYS.stacked)}
                </SelectItem>
                <SelectItem hideIndicator value="split">
                  {t(DIFF_LAYOUT_KEYS.split)}
                </SelectItem>
              </SelectPopup>
            </Select>
          }
        />
        <SettingsRow
          {...searchableSetting("hide-whitespace-changes")}
          description={t("settings.items.hide-whitespace-changes.description")}
          resetAction={
            settings.diffIgnoreWhitespace !== DEFAULT_UNIFIED_SETTINGS.diffIgnoreWhitespace ? (
              <SettingResetButton
                label={t("settings.items.hide-whitespace-changes.resetLabel")}
                onClick={() =>
                  updateSettings({
                    diffIgnoreWhitespace: DEFAULT_UNIFIED_SETTINGS.diffIgnoreWhitespace,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.diffIgnoreWhitespace}
              onCheckedChange={(checked) =>
                updateSettings({ diffIgnoreWhitespace: Boolean(checked) })
              }
              aria-label={t("settings.items.hide-whitespace-changes.controlLabel")}
            />
          }
        />
        <SettingsRow
          {...searchableSetting("default-diff-file-state")}
          description={t("settings.items.default-diff-file-state.description")}
          resetAction={
            settings.diffFilesCollapsed !== DEFAULT_UNIFIED_SETTINGS.diffFilesCollapsed ? (
              <SettingResetButton
                label={t("settings.items.default-diff-file-state.resetLabel")}
                onClick={() =>
                  updateSettings({
                    diffFilesCollapsed: DEFAULT_UNIFIED_SETTINGS.diffFilesCollapsed,
                  })
                }
              />
            ) : null
          }
          control={
            <Select
              value={settings.diffFilesCollapsed ? "collapsed" : "expanded"}
              onValueChange={(value) => {
                if (value === "expanded" || value === "collapsed") {
                  updateSettings({ diffFilesCollapsed: value === "collapsed" });
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-40"
                aria-label={t("settings.items.default-diff-file-state.controlLabel")}
              >
                <SelectValue>
                  {settings.diffFilesCollapsed
                    ? t("settings.support.collapsed")
                    : t("settings.support.expanded")}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                <SelectItem hideIndicator value="expanded">
                  {t("settings.items.default-diff-file-state.text")}
                </SelectItem>
                <SelectItem hideIndicator value="collapsed">
                  {t("settings.items.default-diff-file-state.text.collapsed")}
                </SelectItem>
              </SelectPopup>
            </Select>
          }
        />
        <DiffColorsSettingsRow />
      </SettingsSection>

      <SettingsSection
        id="pull-requests"
        title={t("settings.panels.DiffsSettingsPanel.pull-requests")}
      >
        <SettingsRow
          {...searchableSetting("proactive-panels")}
          description={t("settings.items.proactive-panels.description")}
          resetAction={
            settings.proactivePanelsEnabled !== DEFAULT_UNIFIED_SETTINGS.proactivePanelsEnabled ? (
              <SettingResetButton
                label={t("settings.items.proactive-panels.resetLabel")}
                onClick={() =>
                  updateSettings({
                    proactivePanelsEnabled: DEFAULT_UNIFIED_SETTINGS.proactivePanelsEnabled,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.proactivePanelsEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ proactivePanelsEnabled: Boolean(checked) })
              }
              aria-label={t("settings.items.proactive-panels.controlLabel")}
            />
          }
        />
        <PullRequestLinksOpenInAppSetting />
      </SettingsSection>
    </SettingsPageContainer>
  );
}

/** The Providers panel can render without a settings scope, as its tests do; this row needs one. */
export function CompactIdleThreadsRow() {
  return useOptionalSettingsScope() === null ? null : <ScopedCompactIdleThreadsRow />;
}

function ScopedCompactIdleThreadsRow() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const { targets } = useSettingsScope();
  const idleCompaction = scopedIdleCompaction(targets.length > 0 ? targets : [{ settings }]);

  return (
    <SettingsRow
      serverScoped
      settingKeys={["idleCompaction", "compactIdleThreads"]}
      mixed={idleCompaction.mixed}
      {...searchableSetting("compact-idle-threads")}
      description={t("settings.items.compact-idle-threads.description")}
      resetAction={
        globalIdleCompaction(settings) !== globalIdleCompaction(DEFAULT_UNIFIED_SETTINGS) ? (
          <SettingResetButton
            label={t("settings.items.compact-idle-threads.resetLabel")}
            onClick={() =>
              updateSettings({ idleCompaction: globalIdleCompaction(DEFAULT_UNIFIED_SETTINGS) })
            }
          />
        ) : null
      }
      control={
        <Select
          value={idleCompaction.mixed ? null : globalIdleCompaction(settings)}
          onValueChange={(value) => {
            const mode = IDLE_COMPACTION_MODES.find((candidate) => candidate.value === value);
            if (mode) updateSettings({ idleCompaction: mode.value });
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-56"
            aria-label={t("settings.items.compact-idle-threads.controlLabel")}
          >
            <SelectValue>
              {(value: string | null) =>
                value === null
                  ? t("settings.support.mixed")
                  : IDLE_COMPACTION_MODES.find((mode) => mode.value === value)?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectPopup align="end" alignItemWithTrigger={false}>
            {IDLE_COMPACTION_MODES.map((mode) => (
              <SelectItem
                hideIndicator
                key={mode.value}
                value={mode.value}
                // A server from before modes has only the on/off switch, so it cannot store "Never".
                disabled={mode.value === "off" && !idleCompaction.neverAvailable}
              >
                {mode.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      }
    />
  );
}

export function ThreadsSettingsPanel() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const navigate = useNavigate();
  const { environment, connectedEnvironments, target, scope } = useSettingsScope();
  const isProjectScope = scope.kind === "project" || scope.kind === "checkout";
  const environmentId = environment?.environmentId ?? null;
  const hasServerTargets = connectedEnvironments.length > 0;
  const mixedResponseStreamingMode = useScopedSettingsMixed(["responseStreamingMode"]);
  const providersByEnvironment = useEnvironmentProviders();
  const serverProviders =
    (environment?.serverConfig
      ? providersByEnvironment.get(environment.environmentId)
      : undefined) ?? EMPTY_SERVER_PROVIDERS;
  const supportsAutoSettlementScope = connectedEnvironments.every(
    (target) => target.serverConfig?.environment.capabilities.threadAutoSettlementScope === true,
  );

  const textGenerationProviders = serverProviders.filter(
    (provider) => provider.supportsTextGeneration !== false,
  );
  const textGenerationModelSelection = resolveAppModelSelectionState(
    settings,
    textGenerationProviders,
  );
  const textGenInstanceId = textGenerationModelSelection.instanceId;
  const textGenModel = textGenerationModelSelection.model;
  const textGenModelOptions = textGenerationModelSelection.options;
  const textGenerationModelInstanceEntries = providerInstanceEntriesFor(
    textGenerationProviders,
    settings,
    target?.projectId ?? null,
  );
  const hasTextGenerationProvider = textGenerationModelInstanceEntries.some(
    (entry) => entry.enabled && entry.isAvailable,
  );
  const textGenInstanceEntry = textGenerationModelInstanceEntries.find(
    (entry) => entry.instanceId === textGenInstanceId,
  );
  const textGenProvider: ProviderDriverKind =
    textGenInstanceEntry?.driverKind ?? DEFAULT_DRIVER_KIND;
  const textGenerationModelOptionsByInstance = getCustomModelOptionsByInstance(
    settings,
    textGenerationProviders,
    textGenInstanceId,
    textGenModel,
  );
  const isTextGenerationModelDirty = !Equal.equals(
    settings.textGenerationModelSelection ?? null,
    DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection ?? null,
  );
  const textGenerationModelDisabledReason = useScopedModelDisabledReason(
    settings,
    textGenerationModelInstanceEntries,
  );
  const mixedAddProjectBaseDirectory = useScopedSettingsMixed(["addProjectBaseDirectory"]);
  const mixedTextGenerationModel = useScopedSettingsMixed(["textGenerationModelSelection"]);

  return (
    <SettingsPageContainer>
      <SettingsSection
        id="new-projects"
        title={t("settings.panels.ThreadsSettingsPanel.new-projects")}
      >
        <SettingsRow
          serverScoped
          settingKeys={["addProjectBaseDirectory"]}
          {...searchableSetting("add-project-starts-in")}
          description={t("settings.items.add-project-starts-in.description")}
          resetAction={
            settings.addProjectBaseDirectory !==
            DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory ? (
              <SettingResetButton
                label={t("settings.items.add-project-starts-in.resetLabel")}
                onClick={() =>
                  updateSettings({
                    addProjectBaseDirectory: DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory,
                  })
                }
              />
            ) : null
          }
          control={
            <DraftInput
              size="sm"
              className="w-full sm:w-72"
              value={mixedAddProjectBaseDirectory ? "" : settings.addProjectBaseDirectory}
              onCommit={(next) => updateSettings({ addProjectBaseDirectory: next })}
              placeholder={mixedAddProjectBaseDirectory ? t("settings.support.mixed") : "~/"}
              spellCheck={false}
              aria-label={t("settings.items.add-project-starts-in.controlLabel")}
            />
          }
        />
      </SettingsSection>

      <ProjectDefaultsSettings category="general" />

      {!isProjectScope ? (
        <SettingsSection id="snooze" title={t("settings.panels.ThreadsSettingsPanel.snooze")}>
          <SnoozePresetsRow />
        </SettingsSection>
      ) : null}

      <SettingsSection
        id="usage-limits"
        title={t("settings.panels.ThreadsSettingsPanel.usage-limits")}
      >
        <SettingsRow
          serverScoped
          {...searchableSetting("auto-resume-limited-threads")}
          description={t("settings.items.auto-resume-limited-threads.description")}
          settingKeys={["autoResumeLimitedThreads"]}
          control={
            <ScopedSwitch
              settingKeys={["autoResumeLimitedThreads"]}
              checked={settings.autoResumeLimitedThreads}
              onCheckedChange={(checked) =>
                updateSettings({ autoResumeLimitedThreads: Boolean(checked) })
              }
              aria-label={t("settings.items.auto-resume-limited-threads.controlLabel")}
            />
          }
        />
        <SettingsRow
          serverScoped
          {...searchableSetting("snooze-limited-threads")}
          description={t("settings.items.snooze-limited-threads.description")}
          settingKeys={["snoozeLimitedThreads"]}
          control={
            <ScopedSwitch
              settingKeys={["snoozeLimitedThreads"]}
              checked={settings.snoozeLimitedThreads}
              onCheckedChange={(checked) =>
                updateSettings({ snoozeLimitedThreads: Boolean(checked) })
              }
              aria-label={t("settings.items.snooze-limited-threads.controlLabel")}
            />
          }
        />
      </SettingsSection>

      {hasServerTargets ? (
        <SettingsSection
          id="auto-settle"
          title={t("settings.panels.ThreadsSettingsPanel.auto-settle")}
        >
          <SettingsRow
            serverScoped
            settingKeys={["sidebarAutoSettleOnMerge"]}
            {...searchableSetting("auto-settle-merged-threads")}
            description={t("settings.items.auto-settle-merged-threads.description")}
            resetAction={
              settings.sidebarAutoSettleOnMerge !==
              DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleOnMerge ? (
                <SettingResetButton
                  label={t("settings.items.auto-settle-merged-threads.resetLabel")}
                  onClick={() =>
                    updateSettings({
                      sidebarAutoSettleOnMerge: DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleOnMerge,
                    })
                  }
                />
              ) : null
            }
            control={
              <ScopedSwitch
                settingKeys={["sidebarAutoSettleOnMerge"]}
                checked={settings.sidebarAutoSettleOnMerge}
                onCheckedChange={(checked) =>
                  updateSettings({ sidebarAutoSettleOnMerge: Boolean(checked) })
                }
                aria-label={t("settings.items.auto-settle-merged-threads.controlLabel")}
              />
            }
          />

          <SettingsRow
            serverScoped
            settingKeys={["sidebarAutoSettleAfterDays"]}
            {...searchableSetting("auto-settle-inactive-threads")}
            description={t("settings.items.auto-settle-inactive-threads.description")}
            resetAction={
              settings.sidebarAutoSettleAfterDays !==
              DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays ? (
                <SettingResetButton
                  label={t("settings.items.auto-settle-inactive-threads.resetLabel")}
                  onClick={() =>
                    updateSettings({
                      sidebarAutoSettleAfterDays:
                        DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays,
                    })
                  }
                />
              ) : null
            }
            control={
              <ScopedSwitch
                settingKeys={["sidebarAutoSettleAfterDays"]}
                checked={settings.sidebarAutoSettleAfterDays !== null}
                onCheckedChange={(checked) =>
                  updateSettings({
                    sidebarAutoSettleAfterDays: checked ? AUTO_SETTLE_DEFAULT_DAYS : null,
                  })
                }
                aria-label={t("settings.items.auto-settle-inactive-threads.controlLabel")}
              />
            }
          />
          {settings.sidebarAutoSettleAfterDays !== null ? (
            <SettingsRow
              serverScoped
              settingKeys={["sidebarAutoSettleAfterDays"]}
              title={searchableSetting("days-before-auto-settle", t).title}
              description={t(
                "settings.panels.ThreadsSettingsPanel.any-new-activity-un-settles-a-thread-automatically",
              )}
              control={
                <AutoSettleDaysInput
                  value={settings.sidebarAutoSettleAfterDays}
                  onCommit={(days) => updateSettings({ sidebarAutoSettleAfterDays: days })}
                />
              }
            />
          ) : null}
          {settings.sidebarAutoSettleAfterDays !== null && supportsAutoSettlementScope ? (
            <SettingsRow
              serverScoped
              settingKeys={["sidebarAutoSettleKeepPullRequests"]}
              title={t("settings.panels.ThreadsSettingsPanel.keep-threads-with-a-pr")}
              description={t(
                "settings.panels.ThreadsSettingsPanel.inactivity-does-not-settle-threads-with-a-pull-request",
              )}
              control={
                <ScopedSwitch
                  settingKeys={["sidebarAutoSettleKeepPullRequests"]}
                  checked={settings.sidebarAutoSettleKeepPullRequests}
                  onCheckedChange={(checked) =>
                    updateSettings({ sidebarAutoSettleKeepPullRequests: checked })
                  }
                  aria-label={t("settings.panels.ThreadsSettingsPanel.keep-threads-with-a-pr")}
                />
              }
            />
          ) : null}
        </SettingsSection>
      ) : null}

      <SettingsSection
        id="text-generation"
        title={t("settings.panels.ThreadsSettingsPanel.text-generation")}
      >
        <SettingsRow
          serverScoped
          settingKeys={["textGenerationModelSelection"]}
          {...searchableSetting("text-generation-model")}
          description={t("settings.items.text-generation-model.description")}
          resetAction={
            hasServerTargets && isTextGenerationModelDirty ? (
              <SettingResetButton
                label={t("settings.items.text-generation-model.resetLabel")}
                onClick={() =>
                  updateSettings({
                    textGenerationModelSelection:
                      DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection,
                  })
                }
              />
            ) : null
          }
          control={
            !hasServerTargets ? (
              <span className="text-sm text-muted-foreground">
                {t("settings.items.text-generation-model.text")}
              </span>
            ) : !hasTextGenerationProvider ? (
              <span className="text-sm text-muted-foreground">
                {t(
                  "settings.items.text-generation-model.text.no-text-generation-providers-available",
                )}
              </span>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <ProviderModelPicker
                  environmentId={environmentId}
                  activeInstanceId={textGenInstanceId}
                  model={textGenModel}
                  lockedProvider={null}
                  instanceEntries={textGenerationModelInstanceEntries}
                  modelOptionsByInstance={textGenerationModelOptionsByInstance}
                  triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
                  {...(mixedTextGenerationModel
                    ? { triggerLabel: t("settings.support.mixed") }
                    : {})}
                  getModelDisabledReason={textGenerationModelDisabledReason}
                  {...(environmentId
                    ? {
                        onOpenProviderSetup: (instanceId: ProviderInstanceId) => {
                          void navigate({
                            to: "/settings/providers",
                            search: { environmentId, instanceId },
                          });
                        },
                      }
                    : {})}
                  onInstanceModelChange={(instanceId, model) => {
                    const reason = textGenerationModelDisabledReason(instanceId, model);
                    if (reason) {
                      toastManager.add({
                        type: "error",
                        title: t("settings.support.text-generation-model-not-saved"),
                        description: reason,
                      });
                      return;
                    }
                    updateSettings({
                      textGenerationModelSelection: resolveAppModelSelectionState(
                        {
                          ...settings,
                          textGenerationModelSelection: createModelSelection(instanceId, model),
                        },
                        textGenerationProviders,
                      ),
                    });
                  }}
                />
                {textGenInstanceEntry ? (
                  <TraitsPicker
                    provider={textGenProvider}
                    models={textGenInstanceEntry?.models ?? []}
                    model={textGenModel}
                    modelOptions={textGenModelOptions}
                    allowPromptInjectedEffort={false}
                    planModeEnabled={
                      settings.planModeEnabled || selectsPlanAgent(textGenModelOptions)
                    }
                    triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
                    onModelOptionsChange={(nextOptions) => {
                      updateSettings({
                        textGenerationModelSelection: resolveAppModelSelectionState(
                          {
                            ...settings,
                            textGenerationModelSelection: createModelSelection(
                              textGenInstanceId,
                              textGenModel,
                              nextOptions,
                            ),
                          },
                          textGenerationProviders,
                        ),
                      });
                    }}
                  />
                ) : null}
              </div>
            )
          }
        />
        <AdvancedSettings
          targetIds={[
            searchableSetting("thread-title-instructions").id,
            searchableSetting("response-streaming").id,
          ]}
        >
          <ThreadTitleInstructionsSettings />
          <SettingsRow
            serverScoped
            settingKeys={["responseStreamingMode"]}
            {...searchableSetting("response-streaming")}
            description={
              mixedResponseStreamingMode
                ? t("settings.support.the-selected-targets-use-different-streaming-modes")
                : t(RESPONSE_STREAMING_MODE_DESCRIPTION_KEYS[settings.responseStreamingMode])
            }
            resetAction={
              settings.responseStreamingMode !== DEFAULT_UNIFIED_SETTINGS.responseStreamingMode ? (
                <SettingResetButton
                  label={t("settings.items.response-streaming.resetLabel")}
                  onClick={() =>
                    updateSettings({
                      responseStreamingMode: DEFAULT_UNIFIED_SETTINGS.responseStreamingMode,
                    })
                  }
                />
              ) : null
            }
            control={
              <Select
                value={mixedResponseStreamingMode ? null : settings.responseStreamingMode}
                onValueChange={(value) => {
                  if (value === "turn" || value === "paragraph") {
                    updateSettings({ responseStreamingMode: value });
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full sm:w-56"
                  aria-label={t("settings.items.response-streaming.controlLabel")}
                >
                  <SelectValue>
                    {(value: ResponseStreamingMode | null) =>
                      value === null
                        ? t("settings.support.mixed")
                        : t(RESPONSE_STREAMING_MODE_KEYS[value])
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  <SelectItem hideIndicator value="turn">
                    {t(RESPONSE_STREAMING_MODE_KEYS.turn)}
                  </SelectItem>
                  <SelectItem hideIndicator value="paragraph">
                    {t(RESPONSE_STREAMING_MODE_KEYS.paragraph)}
                  </SelectItem>
                </SelectPopup>
              </Select>
            }
          />
        </AdvancedSettings>
      </SettingsSection>
    </SettingsPageContainer>
  );
}

export function MaintenanceSettingsPanel() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const { scope, environment, connectedEnvironments } = useSettingsScope();
  const environmentId = environment?.environmentId ?? null;
  const isEnvironmentScope = scope.environmentIds.length === 1 && environmentId !== null;
  const hasServerTargets = connectedEnvironments.length > 0;

  return (
    <SettingsPageContainer>
      <SettingsSection id="updates" title={t("settings.panels.MaintenanceSettingsPanel.updates")}>
        <SettingsRow
          serverScoped
          settingKeys={["enableProviderUpdateChecks"]}
          {...searchableSetting("provider-update-checks")}
          description={t("settings.items.provider-update-checks.description")}
          resetAction={
            settings.enableProviderUpdateChecks !==
            DEFAULT_UNIFIED_SETTINGS.enableProviderUpdateChecks ? (
              <SettingResetButton
                label={t("settings.items.provider-update-checks.resetLabel")}
                onClick={() =>
                  updateSettings({
                    enableProviderUpdateChecks: DEFAULT_UNIFIED_SETTINGS.enableProviderUpdateChecks,
                  })
                }
              />
            ) : null
          }
          control={
            <ScopedSwitch
              settingKeys={["enableProviderUpdateChecks"]}
              checked={settings.enableProviderUpdateChecks}
              onCheckedChange={(checked) =>
                updateSettings({ enableProviderUpdateChecks: Boolean(checked) })
              }
              aria-label={t("settings.items.provider-update-checks.controlLabel")}
            />
          }
        />
        <SettingsRow
          {...searchableSetting("continue-threads-after-server-update")}
          serverScoped
          settingKeys={["continueThreadsAfterServerUpdate"]}
          description={t("settings.items.continue-threads-after-server-update.description")}
          status={
            !hasServerTargets
              ? t(
                  "settings.support.all-selected-connected-environments-must-support-restart-continuation",
                )
              : undefined
          }
          resetAction={
            hasServerTargets &&
            settings.continueThreadsAfterServerUpdate !==
              DEFAULT_UNIFIED_SETTINGS.continueThreadsAfterServerUpdate ? (
              <SettingResetButton
                label={t("settings.items.continue-threads-after-server-update.resetLabel")}
                onClick={() =>
                  updateSettings({
                    continueThreadsAfterServerUpdate:
                      DEFAULT_UNIFIED_SETTINGS.continueThreadsAfterServerUpdate,
                  })
                }
              />
            ) : null
          }
          control={
            <ScopedSwitch
              settingKeys={["continueThreadsAfterServerUpdate"]}
              checked={settings.continueThreadsAfterServerUpdate}
              disabled={!hasServerTargets}
              onCheckedChange={(checked) =>
                updateSettings({ continueThreadsAfterServerUpdate: Boolean(checked) })
              }
              aria-label={t("settings.items.continue-threads-after-server-update.controlLabel")}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        id="background"
        title={t("settings.panels.MaintenanceSettingsPanel.background-activity")}
      >
        <BackgroundActivitySettingsRow />
      </SettingsSection>

      <StorageCleanupSections />

      <SettingsSection
        id="diagnostics-section"
        title={t("settings.panels.MaintenanceSettingsPanel.diagnostics")}
      >
        <SettingsRow
          {...searchableSetting("diagnostics")}
          description={
            isEnvironmentScope
              ? t("settings.support.inspect-processes-resource-use-and-logs-on-this-environment")
              : t(
                  "settings.support.inspect-processes-resource-use-and-logs-on-one-environment-at-a-time",
                )
          }
          control={
            <Button
              render={
                <Link to="/settings/diagnostics" search={{ machine: environmentId ?? undefined }} />
              }
              size="sm"
              variant="outline"
            >
              {t("settings.items.diagnostics.text")}
            </Button>
          }
        />
      </SettingsSection>
    </SettingsPageContainer>
  );
}

export function AboutSettingsPanel() {
  const t = useTranslate();
  return (
    <SettingsPageContainer>
      <SettingsSection id="about" title={t("settings.panels.AboutSettingsPanel.app")}>
        {isElectron || HOSTED_APP_CHANNEL ? (
          <AboutVersionSection />
        ) : (
          <>
            <SettingsRow
              id={searchableSetting("app-version").id}
              title={<AboutVersionTitle />}
              description={t(
                "settings.panels.AboutSettingsPanel.current-version-of-the-application",
              )}
            />
          </>
        )}
        <MobileAppSettingsRow />
      </SettingsSection>

      <SettingsSection id="legal" title={t("settings.panels.AboutSettingsPanel.legal")}>
        <SettingsRow
          {...searchableSetting("privacy-policy")}
          description={t("settings.items.privacy-policy.description")}
          control={
            <Button
              render={<a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer noopener" />}
              size="sm"
              variant="outline"
            >
              {t("settings.items.privacy-policy.text")}
            </Button>
          }
        />
        <SettingsRow
          {...searchableSetting("open-source-licenses")}
          description={t("settings.items.open-source-licenses.description")}
          control={
            <Button
              render={<Link to="/settings/open-source-licenses" />}
              size="sm"
              variant="outline"
            >
              {t("settings.items.open-source-licenses.text")}
            </Button>
          }
        />
      </SettingsSection>
    </SettingsPageContainer>
  );
}
