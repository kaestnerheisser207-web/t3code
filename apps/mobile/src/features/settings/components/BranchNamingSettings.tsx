import { useTranslate } from "../../../i18n";
import { BranchNamingMode, type ServerSettingsPatch } from "@t3tools/contracts";
import { useEffect, useEffectEvent, useRef } from "react";
import { View } from "react-native";

import { AppText as Text, AppTextInput } from "../../../components/ui/AppText";
import { ListChoiceRow as SettingsChoiceRow } from "../../../components/ui/ListChoiceRow";
import { SettingsSection } from "./SettingsSection";

export function BranchNamingSettings(props: {
  mode: BranchNamingMode | null;
  prefix: string | null;
  instructions: string | null;
  disabled: boolean;
  onChange: (patch: ServerSettingsPatch) => void;
}) {
  const t = useTranslate();
  const MODES = {
    static: { label: t("branchNaming.static"), description: t("branchNaming.staticHint") },
    semantic: {
      label: t("branchNaming.semantic"),
      description: t("branchNaming.semanticHint"),
    },
    custom: {
      label: t("branchNaming.custom"),
      description: t("branchNaming.customHint"),
    },
  } satisfies Record<BranchNamingMode, { label: string; description: string }>;

  // Save on exit too: Android Back hides the keyboard without ending editing.
  type Field = "branchNamePrefix" | "branchNameInstructions";
  const drafts = useRef<Partial<Record<Field, { text: string; over: string | null }>>>({});
  const savedValue = (field: Field) =>
    field === "branchNamePrefix" ? props.prefix : props.instructions;
  const edit = (field: Field, text: string) => {
    drafts.current[field] = { text, over: savedValue(field) };
  };
  // Drop a draft typed over an older saved value: the updated value has already remounted its input.
  const take = (field: Field): ServerSettingsPatch => {
    const draft = drafts.current[field];
    delete drafts.current[field];
    const saved = savedValue(field);
    // Save even while disabled; the route queues behind pending writes and checks access.
    if (draft === undefined || draft.over !== saved) return {};
    const value = draft.text.trim();
    return saved === null || value !== saved ? { [field]: value } : {};
  };
  const send = (patch: ServerSettingsPatch) => {
    if (Object.keys(patch).length > 0) props.onChange(patch);
  };
  // One patch, because the screen drops writes while another is in flight.
  const saveDrafts = useEffectEvent(() =>
    send({ ...take("branchNamePrefix"), ...take("branchNameInstructions") }),
  );
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- saves unsent branch naming drafts to server settings when the section unmounts
  useEffect(() => () => saveDrafts(), []);
  return (
    <SettingsSection
      title={t("mobile.settings.BranchNamingSettings.worktree-branch-naming")}
      trailing={
        props.mode === null ? (
          <Text className="text-xs text-foreground-muted">
            {t("mobile.settings.BranchNamingSettings.mixed")}
          </Text>
        ) : null
      }
    >
      {BranchNamingMode.literals.map((mode, index) => (
        <SettingsChoiceRow
          key={mode}
          label={MODES[mode].label}
          description={MODES[mode].description}
          selected={props.mode === mode}
          separated={index > 0}
          disabled={props.disabled}
          onPress={() => props.onChange({ branchNamingMode: mode })}
        />
      ))}
      {props.mode === "static" ? (
        <View className="gap-2 px-4 py-3">
          <Text className="text-sm text-foreground-muted">
            {t(
              "mobile.settings.BranchNamingSettings.use-t3-or-t3-for-t3-add-search-leave-empty-for-no-prefix",
            )}
          </Text>
          <AppTextInput
            key={props.prefix}
            accessibilityLabel={t("mobile.settings.BranchNamingSettings.branch-prefix")}
            onChangeText={(text) => edit("branchNamePrefix", text)}
            defaultValue={props.prefix ?? ""}
            placeholder={
              props.prefix === null
                ? t("mobile.dynamic.BranchNamingSettings.mixed")
                : t("mobile.dynamic.BranchNamingSettings.no-prefix")
            }
            editable={!props.disabled}
            autoCapitalize="none"
            autoCorrect={false}
            className="min-h-10 rounded-xl px-3 py-2 text-base text-foreground"
            onEndEditing={() => send(take("branchNamePrefix"))}
          />
        </View>
      ) : null}
      {props.mode === "custom" ? (
        <View className="gap-2 px-4 py-3">
          <Text className="text-sm text-foreground-muted">
            {t("mobile.settings.BranchNamingSettings.append-instructions-to-the-naming-prompt")}
          </Text>
          <AppTextInput
            key={props.instructions}
            accessibilityLabel={t(
              "mobile.settings.BranchNamingSettings.branch-naming-instructions",
            )}
            onChangeText={(text) => edit("branchNameInstructions", text)}
            defaultValue={props.instructions ?? ""}
            placeholder={
              props.instructions === null
                ? t(
                    "mobile.dynamic.BranchNamingSettings.mixed-enter-instructions-for-all-selected-targets",
                  )
                : t(
                    "mobile.dynamic.BranchNamingSettings.use-julius-followed-by-the-issue-id-and-a-short-description",
                  )
            }
            editable={!props.disabled}
            multiline
            autoCapitalize="sentences"
            className="min-h-24 rounded-xl px-3 py-2 text-base text-foreground"
            onEndEditing={() => send(take("branchNameInstructions"))}
          />
        </View>
      ) : null}
    </SettingsSection>
  );
}
