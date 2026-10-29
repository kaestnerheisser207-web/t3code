import { useTranslate } from "../../i18n";
import { ScreenScrollView as ScrollView } from "../../components/ui/ScreenScrollView";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { SidebarProjectGroupingMode } from "@t3tools/contracts";
import { AsyncResult } from "effect/reactivity";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsScreen } from "./components/SettingsScreen";
import {
  mobileProjectGroupingModePatch,
  resolveMobileProjectGroupingSettings,
} from "../../state/project-grouping";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import { ListChoiceRow as SettingsChoiceRow } from "../../components/ui/ListChoiceRow";
import { SettingsSection } from "./components/SettingsSection";
import { NewThreadSettingsSection, WorkingSectionSettings } from "./ThreadSettingsSections";

export function SettingsProjectGroupingRouteScreen() {
  const t = useTranslate();
  const GROUPING_OPTIONS: ReadonlyArray<{
    readonly mode: SidebarProjectGroupingMode;
    readonly label: string;
    readonly description: string;
  }> = [
    {
      mode: "repository",
      label: t("settings.extra.groupRepository"),
      description: t("settings.extra.groupRepositoryHint"),
    },
    {
      mode: "repository_path",
      label: t("settings.extra.groupPath"),
      description: t("settings.extra.groupPathHint"),
    },
    {
      mode: "separate",
      label: t("settings.extra.separate"),
      description: t("settings.extra.separateHint"),
    },
  ];

  const insets = useSafeAreaInsets();
  const preferencesResult = useAtomValue(mobilePreferencesAtom);
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const preferencesReady = AsyncResult.isSuccess(preferencesResult) && !preferencesResult.waiting;
  const selectedMode = AsyncResult.isSuccess(preferencesResult)
    ? resolveMobileProjectGroupingSettings(preferencesResult.value).sidebarProjectGroupingMode
    : null;

  return (
    <SettingsScreen title={t("mobile.settings.SettingsProjectGroupingRouteScreen.general")}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-3 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
      >
        <SettingsSection
          title={t("mobile.settings.SettingsProjectGroupingRouteScreen.project-grouping")}
        >
          {GROUPING_OPTIONS.map((option, index) => (
            <SettingsChoiceRow
              key={option.mode}
              label={option.label}
              description={option.description}
              selected={selectedMode === option.mode}
              separated={index > 0}
              disabled={!preferencesReady}
              onPress={() => savePreferences(mobileProjectGroupingModePatch(option.mode))}
            />
          ))}
        </SettingsSection>
        <WorkingSectionSettings />
        <NewThreadSettingsSection />
      </ScrollView>
    </SettingsScreen>
  );
}
