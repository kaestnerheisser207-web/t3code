import { useTranslate } from "../../../i18n";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";

import { copyTextWithHaptic } from "../../../lib/copyTextWithHaptic";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../../state/preferences";
import { serverEnvironment } from "../../../state/server";
import type { SettingsTarget } from "../settings-environment-filter";
import { ListActionRow as SettingsActionRow } from "../../../components/ui/ListActionRow";
import { SettingsSection } from "./SettingsSection";

/** Suggests `t3 doctor` on every machine whose database still holds at least 1 GiB of freed pages. */
export function DatabaseStorageNotice({
  targets,
}: {
  readonly targets: readonly SettingsTarget[];
}) {
  const t = useTranslate();
  const recommendations = useAtomValue(
    serverEnvironment.databaseCompactionRecommendations(
      JSON.stringify(targets.map((target) => target.environmentId)),
    ),
  );
  const preferences = useAtomValue(mobilePreferencesAtom);
  const updatePreferences = useAtomSet(updateMobilePreferencesAtom);
  const dismissed = AsyncResult.isSuccess(preferences)
    ? (preferences.value.dismissedDatabaseStorageNotices ?? [])
    : [];
  const visible = recommendations.filter(
    (recommendation) => !dismissed.includes(recommendation.environmentId),
  );
  if (visible.length === 0) return null;
  return (
    <SettingsSection
      title={t("mobile.settings.DatabaseStorageNotice.reclaim-database-space")}
      footer={t(
        "mobile.settings.DatabaseStorageNotice.old-history-is-cleaned-up-automatically-but-these-databases-still-hold-the-freed-space-run-the-command-on-each-machine-to-return-it-to-disk-it-pauses-and-restarts-the-background-service-quit-the-desktop-app-first-if-it-hosts-the-environment",
      )}
    >
      {visible.map(({ environmentId, status }) => (
        <SettingsActionRow
          key={environmentId}
          icon="doc.on.doc"
          label={targets.find((target) => target.environmentId === environmentId)?.label ?? ""}
          description={status.compactCommand}
          detail={t("mobile.dynamic.DatabaseStorageNotice.param-gib", {
            value: (status.reclaimableBytes / 1024 ** 3).toFixed(1),
          })}
          onPress={() => copyTextWithHaptic(status.compactCommand, { target: "command" })}
        />
      ))}
      <SettingsActionRow
        icon="xmark"
        label={t("mobile.settings.DatabaseStorageNotice.dismiss")}
        onPress={() =>
          updatePreferences({
            transform: (current) => ({
              dismissedDatabaseStorageNotices: [
                ...new Set([
                  ...(current.dismissedDatabaseStorageNotices ?? []),
                  ...visible.map((recommendation) => recommendation.environmentId),
                ]),
              ],
            }),
          })
        }
      />
    </SettingsSection>
  );
}
