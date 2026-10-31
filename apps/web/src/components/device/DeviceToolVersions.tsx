import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import type { ReactNode } from "react";
import type { DeviceToolVersions as ToolVersions } from "@t3tools/contracts";
import { InlineButton } from "~/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "~/components/ui/popover";

export function DeviceToolVersions({
  tools,
  action,
  kind,
  owner,
  error,
}: {
  tools: ToolVersions | undefined;
  action?: ReactNode;
  kind?: keyof ToolVersions;
  owner?: string | undefined;
  error?: string | undefined;
}) {
  const t = useTranslate();
  const selected = kind ? tools?.[kind] : undefined;
  const version =
    selected?.runningVersion ??
    (selected?.installedVersions.includes(selected.requiredVersion)
      ? selected.requiredVersion
      : selected?.installedVersions
          .toSorted((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          .at(-1));
  const label =
    kind === "hub" ? t("settings.pages.IntegrationsSettings.device-hub") : "Agent device";
  return (
    <Popover>
      <PopoverTrigger
        aria-label={
          kind
            ? t("web.dynamic.DeviceToolVersions.param-param-show-details", {
                label: label,
                value: version
                  ? `version ${version}`
                  : selected
                    ? "not installed"
                    : "version unknown",
              })
            : undefined
        }
        render={<InlineButton tone="muted" />}
      >
        {kind
          ? version
            ? `v${version}`
            : selected
              ? t("web.dynamic.DeviceToolVersions.not-installed")
              : t("web.dynamic.DeviceToolVersions.version-unknown")
          : error
            ? t("web.dynamic.DeviceToolVersions.versions-unavailable")
            : t("web.dynamic.DeviceToolVersions.versions")}
      </PopoverTrigger>
      <PopoverPopup align="end" width="md">
        <PopoverTitle>
          {kind ? label : t("web.dynamic.DeviceToolVersions.device-tools")}
        </PopoverTitle>
        {tools ? (
          <div className="mt-4 divide-y divide-border/50">
            {(
              [
                ["Device hub", tools.hub],
                ["Agent device", tools.agent],
              ] as const
            )
              .filter(([name]) => !kind || name === label)
              .map(([name, tool]) => (
                <div key={name} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  {!kind ? <p className="text-xs font-medium">{name}</p> : null}
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">
                      {t("web.ui.DeviceToolVersions.running")}
                    </dt>
                    <dd className="text-right font-mono">
                      {tool.runningVersion ?? t("web.dynamic.DeviceToolVersions.not-running")}
                    </dd>
                    <dt className="text-muted-foreground">
                      {t("web.ui.DeviceToolVersions.required")}
                    </dt>
                    <dd className="text-right font-mono">{tool.requiredVersion}</dd>
                    <dt className="text-muted-foreground">
                      {t("web.ui.DeviceToolVersions.installed")}
                    </dt>
                    <dd className="text-right font-mono break-words">
                      {tool.installedVersions.join(", ") ||
                        t("web.dynamic.DeviceToolVersions.none")}
                    </dd>
                  </dl>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("web.ui.DeviceToolVersions.versions-have-not-been-checked")}
          </p>
        )}
        <p className="mt-4 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <Trans
            t={t}
            i18nKey="web.rich.DeviceToolVersions.part-tools-update-automatically-on-this-host-when-needed"
            components={{
              value0: (
                <>
                  {owner
                    ? t("web.dynamic.DeviceToolVersions.managed-by-param", { owner: owner })
                    : ""}
                </>
              ),
            }}
          />
        </p>
        {error ? (
          <p role="status" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </PopoverPopup>
    </Popover>
  );
}
