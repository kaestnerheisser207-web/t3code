import { useTranslate } from "../../i18n";
import { useRef } from "react";

import { Textarea } from "../ui/textarea";
import { SettingsRow, SettingResetButton } from "./settingsLayout";
import { useSettingsScope } from "./SettingsScopeContext";
import { searchableSetting } from "./settingsSearch";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "./useScopedSettings";

export function ThreadTitleInstructionsSettings() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const { targets } = useSettingsScope();
  const scopeKey = targets.map((target) => `${target.environmentId}:${target.projectId}`).join(",");
  const edited = useRef(false);
  const updateSettings = useUpdateScopedSettings();
  const mixed = useScopedSettingsMixed(["threadTitleInstructions"]);

  return (
    <SettingsRow
      serverScoped
      settingKeys={["threadTitleInstructions"]}
      {...searchableSetting("thread-title-instructions")}
      description={t(
        "settings.pages.ThreadTitleInstructionsSettings.appended-to-the-prompt-for-new-and-regenerated-thread-titles",
      )}
      resetAction={
        mixed || settings.threadTitleInstructions !== "" ? (
          <SettingResetButton
            label={t("settings.pages.ThreadTitleInstructionsSettings.thread-title-instructions")}
            onClick={() => updateSettings({ threadTitleInstructions: "" })}
          />
        ) : null
      }
    >
      <div className="mt-3 max-w-2xl pb-3.5">
        <Textarea
          key={`${scopeKey}:${mixed}:${settings.threadTitleInstructions}`}
          aria-label={t("settings.pages.ThreadTitleInstructionsSettings.thread-title-instructions")}
          onChange={() => {
            edited.current = true;
          }}
          rows={4}
          defaultValue={mixed ? "" : settings.threadTitleInstructions}
          placeholder={
            mixed
              ? t(
                  "web.dynamic.ThreadTitleInstructionsSettings.mixed-enter-instructions-to-apply-to-all-selected-targets",
                )
              : t(
                  "web.dynamic.ThreadTitleInstructionsSettings.keep-titles-to-a-few-words-lead-with-the-main-subject",
                )
          }
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (edited.current && (mixed || value !== settings.threadTitleInstructions))
              updateSettings({ threadTitleInstructions: value });
            edited.current = false;
          }}
        />
      </div>
    </SettingsRow>
  );
}
