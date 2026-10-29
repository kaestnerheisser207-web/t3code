import { useTranslate } from "../../i18n";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type { EnvironmentId } from "@t3tools/contracts";
import { AsyncResult } from "effect/reactivity";
import { useState } from "react";
import { View } from "react-native";

import { AppText as Text } from "../../components/ui/AppText";
import * as Dialog from "../../components/ui/Dialog";
import {
  describeOutdatedServer,
  serverEnvironment,
  updateOutdatedServer,
} from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { ListActionRow as SettingsActionRow } from "../../components/ui/ListActionRow";
import { SettingsSection } from "./components/SettingsSection";
import {
  environmentReleaseCheckAtom,
  releaseCheckError,
  releaseCheckValue,
} from "./environmentUpdateCheck";

export function OutdatedServerUpdateSection({
  environmentId,
  label,
}: {
  readonly environmentId: EnvironmentId;
  readonly label: string;
}) {
  const t = useTranslate();
  const describe = useAtomCommand(describeOutdatedServer, { reportFailure: false });
  const update = useAtomCommand(updateOutdatedServer, { reportFailure: false });
  const state = useAtomValue(serverEnvironment.updateStateAtom(environmentId));
  const [checkResult, startCheck] = useAtom(environmentReleaseCheckAtom(environmentId));
  const release = releaseCheckValue(checkResult);
  const checking = checkResult.waiting;
  // Starting an update replaces a failed check's message with the update's own state.
  const [checkErrorDismissed, setCheckErrorDismissed] = useState(false);
  const error = checkErrorDismissed ? null : releaseCheckError(checkResult);
  const busy = checking || state.status === "running";

  function check() {
    if (busy) return;
    setCheckErrorDismissed(false);
    startCheck(async () => {
      const description = await describe(environmentId);
      if (AsyncResult.isFailure(description)) throw squashAtomCommandFailure(description);
      return description.value.serverVersion;
    });
  }

  function requestUpdate() {
    const targetVersion = release?.targetVersion;
    if (busy || !release || !targetVersion) return;
    Dialog.alert(
      `Update ${label}?`,
      `Install T3 Code ${targetVersion}. T3 Code restarts on that machine and reconnects. Running threads may be interrupted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: () => {
            setCheckErrorDismissed(true);
            void update({
              environmentId,
              input: { targetVersion },
              fromVersion: release.fromVersion,
            });
          },
        },
      ],
    );
  }

  return (
    <SettingsSection title="T3 Code">
      <View className="gap-1 p-4">
        <Text className="text-base text-foreground">
          {release
            ? t("mobile.dynamic.OutdatedServerUpdateSection.version-param", {
                fromVersion: release.fromVersion,
              })
            : t("mobile.dynamic.OutdatedServerUpdateSection.update-required")}
        </Text>
        <Text className="text-sm text-foreground-muted">
          {state.status === "running"
            ? state.stage === "resuming"
              ? t("mobile.dynamic.OutdatedServerUpdateSection.restarting-and-reconnecting")
              : state.stage === "installing"
                ? t("mobile.dynamic.OutdatedServerUpdateSection.installing-update")
                : t("mobile.dynamic.OutdatedServerUpdateSection.downloading-update")
            : release
              ? release.targetVersion
                ? t("mobile.dynamic.OutdatedServerUpdateSection.version-param-is-available", {
                    targetVersion: release.targetVersion,
                  })
                : t("mobile.dynamic.OutdatedServerUpdateSection.no-newer-version-is-available-yet")
              : t(
                  "mobile.dynamic.OutdatedServerUpdateSection.this-app-needs-a-newer-version-of-t3-code-on-this-machine",
                )}
        </Text>
        {error || state.status === "failed" ? (
          <Text selectable accessibilityRole="alert" className="text-sm text-danger-foreground">
            {error ?? (state.status === "failed" ? state.message : null)}
          </Text>
        ) : null}
      </View>
      <SettingsActionRow
        icon="arrow.clockwise"
        label={t("mobile.settings.OutdatedServerUpdateSection.check-for-updates")}
        disabled={busy}
        loading={checking}
        onPress={check}
      />
      {release?.targetVersion ? (
        <SettingsActionRow
          icon="arrow.up.circle"
          label={
            state.status === "failed"
              ? t("mobile.dynamic.OutdatedServerUpdateSection.retry-update")
              : t("mobile.dynamic.OutdatedServerUpdateSection.update-to-param", {
                  targetVersion: release.targetVersion,
                })
          }
          disabled={busy}
          loading={state.status === "running"}
          onPress={requestUpdate}
        />
      ) : null}
    </SettingsSection>
  );
}
