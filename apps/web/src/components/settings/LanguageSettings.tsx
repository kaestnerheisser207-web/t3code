import { isLanguagePreference } from "@t3tools/client-runtime/i18n";
import { settlePromise } from "@t3tools/client-runtime/state/runtime";
import { useState } from "react";

import { persistClientSettingsUpdate, useClientSettings } from "../../hooks/useSettings";
import { useTranslate } from "../../i18n";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SettingsRow, SettingResetButton } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

export function LanguageSettings() {
  const t = useTranslate();
  const preference = useClientSettings((settings) => settings.languagePreference);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const choices = {
    en: "English",
    "zh-CN": "简体中文",
    system: t("language.system"),
  };

  async function save(value: unknown) {
    if (!isLanguagePreference(value) || saving) return;
    setSaving(true);
    setFailed(false);
    const result = await settlePromise(() =>
      persistClientSettingsUpdate((current) => ({ ...current, languagePreference: value })),
    );
    setSaving(false);
    setFailed(result._tag === "Failure");
  }

  return (
    <SettingsRow
      {...searchableSetting("interface-language")}
      title={t("language.title")}
      description={failed ? t("language.saveFailed") : t("language.description")}
      resetAction={
        preference === "en" ? null : (
          <SettingResetButton label={t("language.title")} onClick={() => void save("en")} />
        )
      }
      control={
        <Select value={preference} disabled={saving} onValueChange={(value) => void save(value)}>
          <SelectTrigger size="sm" aria-label={t("language.title")}>
            <SelectValue>{choices[preference]}</SelectValue>
          </SelectTrigger>
          <SelectPopup align="end" alignItemWithTrigger={false}>
            {Object.entries(choices).map(([value, label]) => (
              <SelectItem key={value} value={value} hideIndicator>
                {label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      }
    />
  );
}
