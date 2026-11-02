import { managedPolicyText, runtimeModeText } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../i18n";
import {
  clampManagedRuntimeMode,
  managedRuntimeModeDenial,
  type ManagedPolicySummary,
  type RuntimeMode,
} from "@t3tools/contracts";
import { View } from "react-native";

import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import {
  updateComposerDraftSettings,
  useComposerDraftSettings,
} from "../../state/use-composer-drafts";
import { runtimeModeChoicesForSupportedModes } from "./thread-settings-options";

/**
 * Shown while a thread's mode is above its environment's managed ceiling, where the server
 * refuses every turn. Switching sets the draft's mode, which the next send applies first.
 */
export function ManagedRuntimeModeNotice(props: {
  readonly threadKey: string;
  readonly threadRuntimeMode: RuntimeMode;
  readonly supportedRuntimeModes: ReadonlyArray<RuntimeMode> | undefined;
  readonly policy: ManagedPolicySummary | undefined;
}) {
  const t = useTranslate();

  const draftSettings = useComposerDraftSettings(props.threadKey);
  const runtimeMode = draftSettings.runtimeMode ?? props.threadRuntimeMode;
  const denial = managedRuntimeModeDenial(props.policy, runtimeMode);
  if (denial === undefined) return null;
  const choices = runtimeModeChoicesForSupportedModes(props.supportedRuntimeModes);
  const target = clampManagedRuntimeMode(
    props.policy,
    runtimeMode,
    choices.map((choice) => choice.mode),
  );
  const targetLabel = target === undefined ? undefined : runtimeModeText(t, target).label;
  return (
    <View className="gap-2 px-4 pb-3">
      <AppText textRole="footnote" className="text-foreground-muted">
        {t("release4066.text192", { value0: managedPolicyText(t, denial) })}
      </AppText>
      {target === undefined || targetLabel === undefined ? null : (
        <Button
          label={t("release3904.switch-to", { channel: targetLabel })}
          onPress={() => updateComposerDraftSettings(props.threadKey, { runtimeMode: target })}
        />
      )}
    </View>
  );
}
