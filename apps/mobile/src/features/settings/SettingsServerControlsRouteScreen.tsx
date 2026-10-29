import type { TranslationKey } from "@t3tools/client-runtime/i18n";
import { runtimeModeText } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../i18n";
import { useNavigation } from "@react-navigation/native";
import { SettingsRow } from "./components/SettingsRow";
import { AuthSettingsWriteScope } from "@t3tools/contracts";
import { readEnvironmentScope, useEnvironmentsWithScope } from "../../state/session";
import { ScreenScrollView as ScrollView } from "../../components/ui/ScreenScrollView";
import { AppText as Text } from "../../components/ui/AppText";
import {
  type ResponseStreamingMode,
  type ServerSettings,
  type ServerSettingsPatch,
  type ThreadEnvMode,
  type WorktreeSubmodules,
  PROJECT_SCOPED_SERVER_SETTING_KEYS,
  type ProjectScopedServerSettingKey,
} from "@t3tools/contracts";
import { useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RUNTIME_MODE_CHOICES } from "../threads/thread-settings-options";
import { SettingsScreen } from "./components/SettingsScreen";
import {
  AndroidSettingsEnvironmentFilter,
  SettingsEnvironmentFilterHeader,
} from "./components/SettingsEnvironmentFilterHeader";
import { BranchNamingSettings } from "./components/BranchNamingSettings";
import { DatabaseStorageNotice } from "./components/DatabaseStorageNotice";
import { ListChoiceRow as SettingsChoiceRow } from "../../components/ui/ListChoiceRow";
import { SettingsSection } from "./components/SettingsSection";
import { SettingsSwitchRow } from "./components/SettingsSwitchRow";
import { SourceControlSignInSection } from "./components/SourceControlSignInSection";
import { SettingsProjectOverridesSection } from "./components/SettingsProjectOverridesSection";
import { useSettingsEnvironmentFilter } from "./settings-environment-filter";
import { useSettingsWriter } from "./useSettingsWriter";
import {
  planMobileScopedSettingsClear,
  planMobileScopedSettingsPatch,
  resolveMobileSettingsTargets,
  uniformMobileSetting,
  type ScopedMobileSettingsTarget,
} from "./settings-scoped-server";
import { PullRequestGlyph } from "../pull-requests/pullRequestGlyphs";
import { AutoSettleSettingsRows } from "./ThreadSettingsSections";
import { supportsSharedSettingsSync } from "@t3tools/client-runtime/state/shared-settings";

type SettingsPage = "threads" | "source-control" | "worktrees" | "maintenance";

const PAGE_TITLE_KEYS: Record<SettingsPage, TranslationKey> = {
  threads: "settings.threads",
  "source-control": "settings.sourceControl",
  worktrees: "settings.worktrees",
  maintenance: "settings.maintenance",
};

const PAGE_PROJECT_KEYS: Record<SettingsPage, readonly ProjectScopedServerSettingKey[]> = {
  threads: [
    "defaultThreadEnvMode",
    "defaultRuntimeMode",
    "responseStreamingMode",
    "enableAgentBrowserAccess",
    "sidebarAutoSettleOnMerge",
    "sidebarAutoSettleAfterDays",
  ],
  "source-control": ["defaultAutoPull", "removeAgentCreditsOnMerge"],
  worktrees: [
    "newWorktreesStartFromOrigin",
    "worktreeSubmodules",
    "branchNamingMode",
    "branchNamePrefix",
    "branchNameInstructions",
  ],
  maintenance: ["continueThreadsAfterServerUpdate"],
};

const SUBMODULE_CHOICES: ReadonlyArray<{
  readonly mode: WorktreeSubmodules | null;
  readonly labelKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
}> = [
  {
    mode: null,
    labelKey: "options.inherit",
    descriptionKey: "options.submodulesInherit",
  },
  {
    mode: "recursive",
    labelKey: "options.recursive",
    descriptionKey: "options.recursiveDescription",
  },
  {
    mode: "top-level",
    labelKey: "options.topLevel",
    descriptionKey: "options.topLevelDescription",
  },
  { mode: "none", labelKey: "options.skip", descriptionKey: "options.skipDescription" },
];

const WORKSPACE_CHOICES: ReadonlyArray<{
  readonly mode: ThreadEnvMode | null;
  readonly labelKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
}> = [
  {
    mode: null,
    labelKey: "options.inherit",
    descriptionKey: "options.workspaceInherit",
  },
  {
    mode: "local",
    labelKey: "options.currentCheckout",
    descriptionKey: "options.currentCheckoutDescription",
  },
  {
    mode: "worktree",
    labelKey: "options.newWorktree",
    descriptionKey: "options.newWorktreeDescription",
  },
];

const STREAMING_CHOICES: ReadonlyArray<{
  readonly mode: ResponseStreamingMode;
  readonly labelKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
}> = [
  {
    mode: "turn",
    labelKey: "options.afterTurn",
    descriptionKey: "options.afterTurnDescription",
  },
  {
    mode: "paragraph",
    labelKey: "options.paragraphs",
    descriptionKey: "options.paragraphsDescription",
  },
];

// Only servers with thread auto-settlement store these, so other targets get the rest of a patch.
const AUTO_SETTLE_SETTING_KEYS: ReadonlySet<string> = new Set([
  "sidebarAutoSettleOnMerge",
  "sidebarAutoSettleAfterDays",
  "autoResumeLimitedThreads",
  "snoozeLimitedThreads",
]);

function planServerSettingsWrites(
  targets: readonly ScopedMobileSettingsTarget[],
  projectSelected: boolean,
  patch: ServerSettingsPatch,
) {
  const capable = targets.filter((target) => supportsSharedSettingsSync(target.environment));
  const others = targets.filter((target) => !supportsSharedSettingsSync(target.environment));
  const othersPatch = Object.fromEntries(
    Object.entries(patch).filter(([key]) => !AUTO_SETTLE_SETTING_KEYS.has(key)),
  ) as ServerSettingsPatch;
  return [
    ...planMobileScopedSettingsPatch(capable, projectSelected, patch),
    ...(Object.keys(othersPatch).length > 0
      ? planMobileScopedSettingsPatch(others, projectSelected, othersPatch)
      : []),
  ];
}

export function SettingsThreadsRouteScreen() {
  return <ServerSettingsDetail page="threads" />;
}

export function SettingsEnvironmentSourceControlRouteScreen() {
  return <ServerSettingsDetail page="source-control" />;
}

export function SettingsWorktreesRouteScreen() {
  return <ServerSettingsDetail page="worktrees" />;
}

export function SettingsEnvironmentMaintenanceRouteScreen() {
  return <ServerSettingsDetail page="maintenance" />;
}

function ServerSettingsDetail(props: { readonly page: SettingsPage }) {
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { selectedTargets, projectGroups, selectedProjectKey } = useSettingsEnvironmentFilter();
  const selectedProject = projectGroups.find((group) => group.key === selectedProjectKey);
  const writableEnvironments = useEnvironmentsWithScope(selectedTargets, AuthSettingsWriteScope);
  const projectSelected = selectedProjectKey !== null;
  const targets = resolveMobileSettingsTargets(
    selectedTargets,
    projectSelected ? (selectedProject?.members.map((member) => member.project) ?? []) : null,
  );
  const [pendingWrites, setPendingWrites] = useState(0);
  const writeInFlight = useRef(false);
  // Closing views can save after controls disable; queue those patches behind the pending write.
  const queuedPatch = useRef<{ key: string; patch: ServerSettingsPatch } | null>(null);
  const targetsKey = targets
    .map((target) => `${target.environment.environmentId}:${target.projectId}`)
    .join(",");
  const [pendingTargets, setPendingTargets] = useState<
    readonly ScopedMobileSettingsTarget[] | null
  >(null);
  const canWriteSettings =
    targets.length > 0 &&
    targets.every((target) => writableEnvironments.has(target.environment.environmentId));
  const displayTargets = pendingWrites > 0 && pendingTargets !== null ? pendingTargets : targets;
  const hasConnectedSelection = targets.length > 0;
  const reference = displayTargets[0] ?? null;
  const uniform = <K extends keyof ServerSettings>(key: K) =>
    uniformMobileSetting(displayTargets, key);
  // `uniform` folds a real null into "mixed"; nullable keys need the distinction.
  const isMixed = (key: keyof ServerSettings) =>
    reference === null ||
    displayTargets.some((entry) => entry.settings[key] !== reference.settings[key]);
  const writeSettings = useSettingsWriter();
  const write = (patch: ServerSettingsPatch) => {
    if (writeInFlight.current) {
      const queued = queuedPatch.current;
      queuedPatch.current = {
        key: targetsKey,
        patch: queued?.key === targetsKey ? { ...queued.patch, ...patch } : patch,
      };
      return;
    }
    if (
      !hasConnectedSelection ||
      !targets.every((target) =>
        readEnvironmentScope(target.environment.environmentId, AuthSettingsWriteScope),
      )
    )
      return;
    const writes = planServerSettingsWrites(targets, projectSelected, patch);
    if (writes.length === 0) return;
    writeInFlight.current = true;
    setPendingTargets(targets);
    setPendingWrites((count) => count + 1);
    void writeSettings(targets, writes).finally(() => {
      writeInFlight.current = false;
      setPendingTargets(null);
      setPendingWrites((count) => count - 1);
      const queued = queuedPatch.current;
      queuedPatch.current = null;
      // These targets may not show this write yet, so send it again with the
      // queued patch; project overrides are replaced whole.
      if (queued?.key === targetsKey) write({ ...patch, ...queued.patch });
    });
  };
  const clearProjectOverrides = () => {
    if (
      writeInFlight.current ||
      !targets.every((target) =>
        readEnvironmentScope(target.environment.environmentId, AuthSettingsWriteScope),
      )
    )
      return;
    const writes = planMobileScopedSettingsClear(targets, PAGE_PROJECT_KEYS[props.page]);
    if (writes.length === 0) return;
    writeInFlight.current = true;
    setPendingTargets(targets);
    setPendingWrites((count) => count + 1);
    void writeSettings(targets, writes).finally(() => {
      writeInFlight.current = false;
      // Resending a draft over these pre-clear targets would undo the clear.
      queuedPatch.current = null;
      setPendingTargets(null);
      setPendingWrites((count) => count - 1);
    });
  };
  const disabled = !canWriteSettings || pendingWrites > 0 || !hasConnectedSelection;
  const disabledFor = (key: string) =>
    disabled ||
    (projectSelected &&
      !PROJECT_SCOPED_SERVER_SETTING_KEYS.includes(
        key as (typeof PROJECT_SCOPED_SERVER_SETTING_KEYS)[number],
      ));

  return (
    <>
      <SettingsEnvironmentFilterHeader />
      <SettingsScreen
        title={t(PAGE_TITLE_KEYS[props.page])}
        trailing={<AndroidSettingsEnvironmentFilter />}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="gap-6 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
        >
          {!hasConnectedSelection || reference === null ? (
            <Text className="px-2 text-base text-foreground-muted">
              {projectSelected
                ? t(
                    "mobile.dynamic.SettingsServerControlsRouteScreen.select-a-project-with-a-checkout-on-a-connected-environment",
                  )
                : t(
                    "mobile.dynamic.SettingsServerControlsRouteScreen.use-the-filter-above-to-select-a-connected-environment",
                  )}
            </Text>
          ) : (
            <>
              {projectSelected ? (
                <SettingsProjectOverridesSection
                  projectLabel={selectedProject?.label ?? "Unavailable project"}
                  hasOverrides={targets.some((target) =>
                    PAGE_PROJECT_KEYS[props.page].some((key) => target.sources[key] === "project"),
                  )}
                  pending={pendingWrites > 0}
                  disabled={!canWriteSettings}
                  onClear={clearProjectOverrides}
                />
              ) : null}
              {props.page === "threads" ? (
                <>
                  <SettingsSection
                    title={t("mobile.settings.SettingsServerControlsRouteScreen.default-workspace")}
                    trailing={
                      pendingWrites === 0 && isMixed("defaultThreadEnvMode") ? (
                        <MixedValuesLabel projectSelected={projectSelected} />
                      ) : null
                    }
                  >
                    {WORKSPACE_CHOICES.filter(
                      (choice) => choice.mode !== null || !projectSelected,
                    ).map((choice, index) => (
                      <SettingsChoiceRow
                        key={choice.mode ?? "inherit"}
                        label={t(choice.labelKey)}
                        description={t(choice.descriptionKey)}
                        selected={
                          !isMixed("defaultThreadEnvMode") &&
                          uniform("defaultThreadEnvMode") === choice.mode
                        }
                        separated={index > 0}
                        disabled={disabledFor("defaultThreadEnvMode")}
                        onPress={() => write({ defaultThreadEnvMode: choice.mode })}
                      />
                    ))}
                  </SettingsSection>
                  <SettingsSection
                    title={t(
                      "mobile.settings.SettingsServerControlsRouteScreen.default-permissions",
                    )}
                    trailing={
                      pendingWrites === 0 && uniform("defaultRuntimeMode") === null ? (
                        <MixedValuesLabel projectSelected={projectSelected} />
                      ) : null
                    }
                  >
                    {RUNTIME_MODE_CHOICES.map((choice, index) => (
                      <SettingsChoiceRow
                        key={choice.mode}
                        label={runtimeModeText(t, choice.mode).label}
                        description={runtimeModeText(t, choice.mode).description}
                        selected={uniform("defaultRuntimeMode") === choice.mode}
                        separated={index > 0}
                        disabled={disabledFor("defaultRuntimeMode")}
                        onPress={() => write({ defaultRuntimeMode: choice.mode })}
                      />
                    ))}
                  </SettingsSection>
                  <SettingsSection
                    title={t(
                      "mobile.settings.SettingsServerControlsRouteScreen.response-streaming",
                    )}
                    trailing={
                      pendingWrites === 0 && uniform("responseStreamingMode") === null ? (
                        <MixedValuesLabel projectSelected={projectSelected} />
                      ) : null
                    }
                  >
                    {STREAMING_CHOICES.map((choice, index) => (
                      <SettingsChoiceRow
                        key={choice.mode}
                        label={t(choice.labelKey)}
                        description={t(choice.descriptionKey)}
                        selected={uniform("responseStreamingMode") === choice.mode}
                        separated={index > 0}
                        disabled={disabledFor("responseStreamingMode")}
                        onPress={() => write({ responseStreamingMode: choice.mode })}
                      />
                    ))}
                  </SettingsSection>
                  <SettingsSection
                    title={t("mobile.settings.SettingsServerControlsRouteScreen.preview-browser")}
                  >
                    <SettingsSwitchRow
                      icon="globe"
                      label={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.agent-browser-access",
                      )}
                      subtitle={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.allow-agents-to-use-the-in-app-preview-browser",
                      )}
                      value={uniform("enableAgentBrowserAccess")}
                      disabled={disabledFor("enableAgentBrowserAccess")}
                      onValueChange={(value) => write({ enableAgentBrowserAccess: value })}
                    />
                  </SettingsSection>
                  <AutoSettleSettingsRows write={write} pending={pendingWrites > 0} />
                </>
              ) : null}

              {props.page === "source-control" ? (
                <>
                  {projectSelected ? null : (
                    <SourceControlSignInSection
                      environments={selectedTargets}
                      canWrite={(environmentId) => writableEnvironments.has(environmentId)}
                    />
                  )}
                  <SettingsSection
                    title={t("mobile.settings.SettingsServerControlsRouteScreen.pull-requests")}
                  >
                    <SettingsSwitchRow
                      icon={PullRequestGlyph.merged}
                      label={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.remove-agent-credits-when-merging",
                      )}
                      subtitle={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.remove-recognized-agent-credits-from-merge-and-squash-messages-on-hosts-that-support-it-keeping-human-co-authors-includes-auto-merge-excludes-merge-queues-stack-merges-and-existing-commits",
                      )}
                      value={uniform("removeAgentCreditsOnMerge")}
                      disabled={disabledFor("removeAgentCreditsOnMerge")}
                      onValueChange={(value) => write({ removeAgentCreditsOnMerge: value })}
                    />
                  </SettingsSection>
                  <SettingsSection
                    title={t("mobile.settings.SettingsServerControlsRouteScreen.default-branch")}
                  >
                    <SettingsSwitchRow
                      icon="arrow.down.circle"
                      label={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.automatically-pull",
                      )}
                      subtitle={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.keep-the-default-branch-current-when-there-are-no-local-changes",
                      )}
                      value={uniform("defaultAutoPull")}
                      disabled={disabledFor("defaultAutoPull")}
                      onValueChange={(value) => write({ defaultAutoPull: value })}
                    />
                  </SettingsSection>
                </>
              ) : null}

              {props.page === "worktrees" ? (
                <>
                  <SettingsSection
                    title={t("mobile.settings.SettingsServerControlsRouteScreen.new-worktrees")}
                  >
                    <SettingsSwitchRow
                      icon="arrow.triangle.branch"
                      label={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.start-from-remote",
                      )}
                      subtitle={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.uses-the-latest-commit-of-the-base-branch-s-tracked-remote-branch-even-if-its-name-differs-otherwise-uses-the-same-named-branch-on-origin-uses-your-local-branch-if-that-remote-branch-is-missing",
                      )}
                      value={uniform("newWorktreesStartFromOrigin")}
                      disabled={disabledFor("newWorktreesStartFromOrigin")}
                      onValueChange={(value) => write({ newWorktreesStartFromOrigin: value })}
                    />
                  </SettingsSection>
                  <SettingsSection
                    title={t(
                      "mobile.settings.SettingsServerControlsRouteScreen.worktree-submodules",
                    )}
                    trailing={
                      pendingWrites === 0 && isMixed("worktreeSubmodules") ? (
                        <MixedValuesLabel projectSelected={projectSelected} />
                      ) : null
                    }
                  >
                    {SUBMODULE_CHOICES.filter(
                      (choice) => choice.mode !== null || !projectSelected,
                    ).map((choice, index) => (
                      <SettingsChoiceRow
                        key={choice.mode ?? "inherit"}
                        label={t(choice.labelKey)}
                        description={t(choice.descriptionKey)}
                        selected={
                          !isMixed("worktreeSubmodules") &&
                          uniform("worktreeSubmodules") === choice.mode
                        }
                        separated={index > 0}
                        disabled={disabledFor("worktreeSubmodules")}
                        onPress={() => write({ worktreeSubmodules: choice.mode })}
                      />
                    ))}
                  </SettingsSection>
                  <BranchNamingSettings
                    key={targetsKey}
                    mode={uniform("branchNamingMode")}
                    prefix={uniform("branchNamePrefix")}
                    instructions={uniform("branchNameInstructions")}
                    disabled={disabledFor("branchNamingMode")}
                    onChange={write}
                  />
                </>
              ) : null}

              {props.page === "maintenance" ? (
                <>
                  {!projectSelected ? (
                    <DatabaseStorageNotice
                      targets={selectedTargets.filter(
                        (target) =>
                          target.serverConfig.environment.capabilities.databaseStorage === true,
                      )}
                    />
                  ) : null}
                  {!projectSelected ? (
                    <SettingsSection
                      title={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.manage-environments",
                      )}
                    >
                      {selectedTargets.map((target) => (
                        <SettingsRow
                          key={target.environmentId}
                          icon="server.rack"
                          label={target.label}
                          value="Server and provider updates"
                          onPress={() =>
                            navigation.navigate("SettingsEnvironmentDetail", {
                              environmentId: target.environmentId,
                            })
                          }
                        />
                      ))}
                    </SettingsSection>
                  ) : null}
                  <SettingsSection
                    title={t("mobile.settings.SettingsServerControlsRouteScreen.updates")}
                  >
                    <SettingsSwitchRow
                      icon="arrow.clockwise"
                      label={t(
                        "mobile.settings.SettingsServerControlsRouteScreen.check-provider-updates",
                      )}
                      subtitle={
                        projectSelected
                          ? t(
                              "mobile.dynamic.SettingsServerControlsRouteScreen.environment-wide-setting-select-all-projects-to-change-it",
                            )
                          : t(
                              "mobile.dynamic.SettingsServerControlsRouteScreen.check-installed-provider-clis-for-newer-versions-and-fetch-model-catalog-updates-when-off-new-models-may-not-appear",
                            )
                      }
                      value={uniform("enableProviderUpdateChecks")}
                      disabled={disabledFor("enableProviderUpdateChecks")}
                      onValueChange={(value) => write({ enableProviderUpdateChecks: value })}
                    />
                    <View className="border-t border-border-subtle">
                      <SettingsSwitchRow
                        icon="arrow.uturn.forward"
                        label={t(
                          "mobile.settings.SettingsServerControlsRouteScreen.continue-after-restart",
                        )}
                        subtitle={t(
                          "mobile.settings.SettingsServerControlsRouteScreen.resume-interrupted-threads-after-an-update-or-restart",
                        )}
                        value={uniform("continueThreadsAfterServerUpdate")}
                        disabled={disabledFor("continueThreadsAfterServerUpdate")}
                        onValueChange={(value) =>
                          write({ continueThreadsAfterServerUpdate: value })
                        }
                      />
                    </View>
                  </SettingsSection>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </SettingsScreen>
    </>
  );
}

function MixedValuesLabel(props: { readonly projectSelected: boolean }) {
  const t = useTranslate();
  return (
    <Text
      accessibilityLabel={
        props.projectSelected
          ? t(
              "mobile.dynamic.SettingsServerControlsRouteScreen.selected-project-checkouts-use-different-values",
            )
          : t(
              "mobile.dynamic.SettingsServerControlsRouteScreen.selected-environments-use-different-values",
            )
      }
      className="px-2 text-sm text-foreground-muted android:px-4"
    >
      {t("mobile.settings.SettingsServerControlsRouteScreen.mixed")}
    </Text>
  );
}
