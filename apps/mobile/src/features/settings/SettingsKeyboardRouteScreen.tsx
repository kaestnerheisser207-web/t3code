import type { TranslationKey } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../i18n";
import { ScreenScrollView as ScrollView } from "../../components/ui/ScreenScrollView";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText as Text } from "../../components/ui/AppText";
import {
  DEFAULT_COMPOSER_ENTER_BEHAVIOR,
  type ComposerEnterBehavior,
} from "../../lib/composerEnterBehavior";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import { ListChoiceRow as SettingsChoiceRow } from "../../components/ui/ListChoiceRow";
import { SettingsScreen } from "./components/SettingsScreen";
import { SettingsSection } from "./components/SettingsSection";

const SEND_MODIFIER = Platform.OS === "android" ? "Ctrl" : "Command";

const ENTER_BEHAVIOR_OPTIONS: ReadonlyArray<{
  readonly behavior: ComposerEnterBehavior;
  readonly labelKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
}> = [
  {
    behavior: "send",
    labelKey: "options.sendMessage",
    descriptionKey: "options.sendMessageDescription",
  },
  {
    behavior: "newline",
    labelKey: "options.newline",
    descriptionKey: "release4491.text119",
  },
];

export function SettingsKeyboardRouteScreen() {
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const preferencesResult = useAtomValue(mobilePreferencesAtom);
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const preferencesReady = AsyncResult.isSuccess(preferencesResult) && !preferencesResult.waiting;
  const selectedBehavior = AsyncResult.isSuccess(preferencesResult)
    ? (preferencesResult.value.composerEnterBehavior ?? DEFAULT_COMPOSER_ENTER_BEHAVIOR)
    : null;

  return (
    <SettingsScreen title={t("mobile.settings.SettingsKeyboardRouteScreen.keyboard")}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-3 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
      >
        <SettingsSection title={t("mobile.settings.SettingsKeyboardRouteScreen.return-key")}>
          {ENTER_BEHAVIOR_OPTIONS.map((option, index) => (
            <SettingsChoiceRow
              key={option.behavior}
              label={t(option.labelKey)}
              description={
                option.behavior === "newline"
                  ? t("release4491.text119", { value0: SEND_MODIFIER })
                  : t(option.descriptionKey)
              }
              selected={selectedBehavior === option.behavior}
              separated={index > 0}
              disabled={!preferencesReady}
              onPress={() => savePreferences({ composerEnterBehavior: option.behavior })}
            />
          ))}
        </SettingsSection>
        <Text className="px-2 text-sm text-foreground-muted">
          {t(
            "mobile.settings.SettingsKeyboardRouteScreen.applies-to-the-composer-when-a-hardware-keyboard-is-connected",
          )}
        </Text>
      </ScrollView>
    </SettingsScreen>
  );
}
