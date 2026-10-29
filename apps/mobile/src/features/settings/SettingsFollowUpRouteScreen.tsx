import { useTranslate } from "../../i18n";
import { ScreenScrollView as ScrollView } from "../../components/ui/ScreenScrollView";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText as Text } from "../../components/ui/AppText";
import { DEFAULT_FOLLOW_UP_BEHAVIOR, type FollowUpBehavior } from "../../lib/followUpBehavior";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import { ListChoiceRow as SettingsChoiceRow } from "../../components/ui/ListChoiceRow";
import { SettingsSection } from "./components/SettingsSection";
import { SettingsScreen } from "./components/SettingsScreen";

const FOLLOW_UP_OPTIONS: ReadonlyArray<{
  readonly behavior: FollowUpBehavior;
  readonly label: string;
  readonly description: string;
}> = [
  {
    behavior: "queue",
    label: "Queue",
    description: "Your message waits and runs after the current turn finishes.",
  },
  {
    behavior: "steer",
    label: "Steer",
    description: "Your message reaches the agent right away, changing what it is working on.",
  },
];

export function SettingsFollowUpRouteScreen() {
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const preferencesResult = useAtomValue(mobilePreferencesAtom);
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const preferencesReady = AsyncResult.isSuccess(preferencesResult) && !preferencesResult.waiting;
  const selectedBehavior = AsyncResult.isSuccess(preferencesResult)
    ? (preferencesResult.value.followUpBehavior ?? DEFAULT_FOLLOW_UP_BEHAVIOR)
    : null;

  const content = (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerClassName="gap-3 px-5 pt-4"
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
    >
      <SettingsSection
        title={t("mobile.settings.SettingsFollowUpRouteScreen.while-the-agent-is-running")}
      >
        {FOLLOW_UP_OPTIONS.map((option, index) => (
          <SettingsChoiceRow
            key={option.behavior}
            label={t(option.behavior === "queue" ? "followUp.queue" : "followUp.steer")}
            description={t(
              option.behavior === "queue"
                ? "followUp.queueDescription"
                : "followUp.steerDescription",
            )}
            selected={selectedBehavior === option.behavior}
            separated={index > 0}
            disabled={!preferencesReady}
            onPress={() => savePreferences({ followUpBehavior: option.behavior })}
          />
        ))}
      </SettingsSection>
      <Text className="px-2 text-sm text-foreground-muted">
        {t(
          "mobile.settings.SettingsFollowUpRouteScreen.long-press-the-send-button-to-use-the-other-option-for-a-single-message-with-a-hardware-keyboard-hold-command-while-sending",
        )}
      </Text>
    </ScrollView>
  );

  return Platform.OS === "android" ? (
    <SettingsScreen title={t("mobile.settings.SettingsFollowUpRouteScreen.chat")}>
      {content}
    </SettingsScreen>
  ) : (
    <View collapsable={false} className="flex-1 bg-sheet">
      {content}
    </View>
  );
}
