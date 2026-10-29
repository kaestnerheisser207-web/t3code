import type { TFunction } from "i18next";
import { useTranslate } from "../../i18n";
import { useAtomValue } from "@effect/atom-react";
import { resolveEnvironmentMachineKind } from "@t3tools/contracts";
import {
  pullRequestRoutingConnectionKey,
  pullRequestRoutingPermissionFor,
  type PullRequestRoutingPermission,
} from "@t3tools/client-runtime/connection";
import { useState } from "react";

import { environmentCatalog } from "~/connection/catalog";
import type { EnvironmentPresentation } from "~/state/environments";
import { useAtomCommand } from "~/state/use-atom-command";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { toastManager } from "../ui/toast";
import { EnvironmentRow, environmentTransportLabel } from "./EnvironmentRow";
import { FoldedSettingsSection } from "./FoldedSettingsSection";
import { searchableSetting } from "./settingsSearch";

const options: ReadonlyArray<{
  value: PullRequestRoutingPermission;
  labelKey:
    | "settings.dynamic.routingOff"
    | "settings.dynamic.routingRead"
    | "settings.dynamic.routingAct";
}> = [
  { value: "off", labelKey: "settings.dynamic.routingOff" },
  { value: "read", labelKey: "settings.dynamic.routingRead" },
  { value: "read-write", labelKey: "settings.dynamic.routingAct" },
];

const summaryKeys = {
  "read-write": "settings.dynamic.routingActSummary",
  read: "settings.dynamic.routingReadSummary",
} as const;

function summarizePullRequestRouting(
  entries: ReadonlyArray<{
    readonly label: string;
    readonly permission: PullRequestRoutingPermission;
  }>,
  t: TFunction,
): string | null {
  const groups = (["read-write", "read"] as const).flatMap((permission) => {
    const labels = entries.filter((entry) => entry.permission === permission);
    return labels.length === 0
      ? []
      : [
          t(summaryKeys[permission], {
            environments: labels.map((entry) => entry.label).join(", "),
          }),
        ];
  });
  return groups.length === 0 ? null : groups.join(" · ");
}

export function PullRequestRoutingSettings({
  environments,
}: {
  readonly environments: ReadonlyArray<EnvironmentPresentation>;
}) {
  const t = useTranslate();
  const translatedOptions = options.map(({ value, labelKey }) => ({ value, label: t(labelKey) }));
  const permissions = useAtomValue(environmentCatalog.pullRequestRoutingPermissionsValueAtom);
  const catalog = useAtomValue(environmentCatalog.catalogValueAtom);
  const update = useAtomCommand(environmentCatalog.setPullRequestRoutingPermission);
  const [saving, setSaving] = useState(false);

  if (environments.length < 2) return null;

  const { id, title } = searchableSetting("pull-request-routing", t);
  return (
    <FoldedSettingsSection
      id={id}
      title={title}
      summary={
        summarizePullRequestRouting(
          environments.map((environment) => ({
            label: environment.label,
            permission: pullRequestRoutingPermissionFor(environment.entry, permissions),
          })),
          t,
        ) ?? t("settings.dynamic.routingOff")
      }
    >
      <p className="px-3 py-2.5 text-xs text-muted-foreground sm:px-4">
        {t(
          "settings.pages.PullRequestRoutingSettings.machines-you-trust-here-can-read-pr-data-through-each-other-s-source-control-access-enable-both-machines-read-and-act-may-use-broader-permissions-than-the-machine-that-owns-them-this-applies-only-to-this-device",
        )}
      </p>
      {environments.map((environment) => (
        <EnvironmentRow
          key={environment.environmentId}
          kind={resolveEnvironmentMachineKind(environment.serverConfig)}
          label={environment.label}
          subtitle={environmentTransportLabel(environment)}
        >
          <Select
            items={translatedOptions}
            value={pullRequestRoutingPermissionFor(environment.entry, permissions)}
            disabled={
              !catalog.isReady ||
              saving ||
              pullRequestRoutingConnectionKey(environment.entry) === null
            }
            onValueChange={(permission) => {
              if (permission === null) return;
              setSaving(true);
              void update({ environmentId: environment.environmentId, permission }).then(
                (result) => {
                  setSaving(false);
                  if (result._tag === "Failure")
                    toastManager.add({
                      type: "error",
                      title: t("settings.dynamic.routingSaveError"),
                    });
                },
              );
            }}
          >
            <SelectTrigger
              size="xs"
              className="w-32"
              aria-label={t("settings.dynamic.routingLabel", { environment: environment.label })}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectPopup align="end" alignItemWithTrigger={false}>
              {translatedOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </EnvironmentRow>
      ))}
    </FoldedSettingsSection>
  );
}
