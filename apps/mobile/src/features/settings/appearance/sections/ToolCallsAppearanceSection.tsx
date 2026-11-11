import type { TranslationKey } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../../../i18n";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { ToolCallVisibility } from "@t3tools/contracts/settings";
import { AsyncResult } from "effect/reactivity";
import { View } from "react-native";

import { AppText as Text } from "../../../../components/ui/AppText";
import { ListChoiceRow } from "../../../../components/ui/ListChoiceRow";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../../../state/preferences";
import { SettingsSection } from "../../components/SettingsSection";

const TOOL_CALL_VISIBILITY_OPTIONS: ReadonlyArray<{
  readonly value: ToolCallVisibility;
  readonly labelKey: TranslationKey;
}> = [
  { value: "showAll", labelKey: "web.dynamic.PullRequestChecksPopover.show-all" },
  { value: "hideSuccessful", labelKey: "release4262.hide-successful" },
  { value: "hideAll", labelKey: "release4262.hide-all" },
  { value: "zen", labelKey: "release4262.zen" },
];

export function ToolCallsAppearanceSection() {
  const t = useTranslate();
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const preferences = useAtomValue(mobilePreferencesAtom);
  const selected = AsyncResult.isSuccess(preferences)
    ? (preferences.value.toolCallVisibility ?? "showAll")
    : null;

  return (
    <View className="gap-3">
      <SettingsSection title={t("release4262.tool-calls-in-chat")}>
        {TOOL_CALL_VISIBILITY_OPTIONS.map((option, index) => (
          <ListChoiceRow
            key={option.value}
            label={t(option.labelKey)}
            selected={selected === option.value}
            separated={index > 0}
            disabled={selected === null}
            onPress={() => savePreferences({ toolCallVisibility: option.value })}
          />
        ))}
      </SettingsSection>
      <Text className="px-2 text-sm text-foreground-muted">
        {t("release4262.tool-calls-detail")}
      </Text>
    </View>
  );
}
