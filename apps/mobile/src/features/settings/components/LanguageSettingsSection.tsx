import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { LanguagePreference } from "@t3tools/contracts/settings";
import * as Exit from "effect/Exit";
import { AsyncResult } from "effect/reactivity";
import { useState } from "react";
import { View } from "react-native";

import { ListChoiceRow } from "../../../components/ui/ListChoiceRow";
import { useTranslate } from "../../../i18n";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../../state/preferences";
import { SettingsSection } from "./SettingsSection";

export function LanguageSettingsSection() {
  const t = useTranslate();
  const preferences = useAtomValue(mobilePreferencesAtom);
  const savePreferences = useAtomSet(updateMobilePreferencesAtom, { mode: "promiseExit" });
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = AsyncResult.isSuccess(preferences);
  const selected = ready ? (preferences.value.languagePreference ?? "en") : "en";
  const choices = [
    { value: "en", label: "English" },
    { value: "zh-CN", label: "简体中文" },
    { value: "system", label: t("language.system") },
  ] as const;

  async function save(languagePreference: LanguagePreference) {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    const result = await savePreferences({ languagePreference });
    setSaving(false);
    setFailed(Exit.isFailure(result));
  }

  return (
    <SettingsSection
      title={t("language.title")}
      footer={failed ? t("language.saveFailed") : t("language.description")}
    >
      <View accessibilityRole="radiogroup">
        {choices.map((choice, index) => (
          <ListChoiceRow
            key={choice.value}
            label={choice.label}
            selected={selected === choice.value}
            disabled={!ready || saving}
            separated={index > 0}
            onPress={() => void save(choice.value)}
          />
        ))}
      </View>
    </SettingsSection>
  );
}
