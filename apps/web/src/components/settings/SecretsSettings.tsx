import { useTranslate } from "../../i18n";
import type { SecretProviderConfig, SecretProviderId } from "@t3tools/contracts";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { useEnvironmentSettings, useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import type { EnvironmentPresentation } from "../../state/environments";
import { useEnvironmentSessionState } from "../../state/session";
import { OnePasswordIcon, type Icon } from "../Icons";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { SecretProviderDialog } from "./SecretProviderDialog";
import { classifySecretProvider } from "./SecretProviderDialog.logic";
import {
  classifyProviderEnvironmentAccess,
  resolveRemoteOperateAccess,
} from "./ProviderSettingsPanel.logic";
import { useSettingsScope } from "./SettingsScopeContext";
import { RedactedSensitiveText } from "./RedactedSensitiveText";
import { searchableSetting } from "./settingsSearch";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";

const SECRET_PROVIDER_KINDS: Readonly<
  Record<string, { readonly name: string; readonly icon: Icon }>
> = {
  one_password: { name: "1Password", icon: OnePasswordIcon },
};

export function SecretsSettingsPanel() {
  const t = useTranslate();
  const { scope, environment } = useSettingsScope();
  const connected = environment?.connection.phase === "connected";
  return (
    <SettingsPageContainer>
      {connected &&
      environment.serverConfig !== null &&
      environment.serverConfig.secretProviderSettings !== true ? (
        <SettingsSection {...searchableSetting("secret-providers")}>
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {t("release3904.secret-update", { environment: environment.label })}
          </p>
        </SettingsSection>
      ) : connected ? (
        <EnvironmentSecretProviders
          key={environment.environmentId}
          environment={environment}
          projectScoped={scope.kind === "project" || scope.kind === "checkout"}
        />
      ) : (
        <SettingsSection {...searchableSetting("secret-providers")}>
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {t(
              "release3904.connect-an-environment-to-manage-the-secret-providers-its-provider-variables-read-from",
            )}
          </p>
        </SettingsSection>
      )}
    </SettingsPageContainer>
  );
}

function EnvironmentSecretProviders({
  environment,
  projectScoped,
}: {
  readonly environment: EnvironmentPresentation;
  readonly projectScoped: boolean;
}) {
  const t = useTranslate();
  const environmentId = environment.environmentId;
  const sessionState = useEnvironmentSessionState(environmentId);
  // The server requires the same grant for secret providers as for provider settings.
  const access = classifyProviderEnvironmentAccess({
    connectionPhase: environment.connection.phase,
    hasServerConfig: environment.serverConfig !== null,
    operateAccess: resolveRemoteOperateAccess({
      session: sessionState.data,
      isPending: sessionState.isPending,
      hasError: sessionState.hasError,
    }),
  });
  const readOnly = access.kind !== "editable" || projectScoped;
  const providers = useEnvironmentSettings(environmentId, (settings) => settings.secretProviders);
  const updateSettings = useUpdateEnvironmentSettings(environmentId);
  const [dialog, setDialog] = useState<
    null | { readonly mode: "add" } | { readonly mode: "edit"; readonly id: SecretProviderId }
  >(null);
  const entries = Object.entries(providers) as Array<[SecretProviderId, SecretProviderConfig]>;
  const editingConfig = dialog?.mode === "edit" ? providers[dialog.id] : undefined;
  const editing =
    dialog?.mode === "edit" && editingConfig !== undefined
      ? { id: dialog.id, config: editingConfig }
      : undefined;
  return (
    <>
      <SettingsSection
        {...searchableSetting("secret-providers")}
        headerAction={
          !readOnly ? (
            <Button size="xs" variant="outline" onClick={() => setDialog({ mode: "add" })}>
              <PlusIcon className="size-3" aria-hidden />
              {t("release3904.add-provider")}
            </Button>
          ) : null
        }
      >
        {projectScoped ? (
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            {t("release3904.environment-wide-setting-select-an-environment-to-change-it")}
          </p>
        ) : null}
        {entries.length === 0 ? (
          <SettingsRow
            title={t("release3904.no-secret-providers-configured")}
            description={t(
              "release3904.add-a-1password-account-then-pick-it-as-the-source-of-a-provider-variable",
            )}
          />
        ) : (
          entries.map(([id, config]) => {
            const classified = classifySecretProvider(config);
            const kind =
              classified.kind === "unsupported"
                ? undefined
                : SECRET_PROVIDER_KINDS[classified.kind];
            return (
              <SettingsRow
                key={id}
                title={
                  <span className="flex min-w-0 items-center gap-2">
                    {kind ? (
                      <kind.icon className="size-4.5 shrink-0 text-foreground/80" aria-hidden />
                    ) : null}
                    <span className="min-w-0 wrap-anywhere">{config.label}</span>
                  </span>
                }
                description={
                  classified.kind === "one_password" && kind ? (
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="shrink-0">{kind.name} ·</span>
                      <RedactedSensitiveText
                        value={classified.account}
                        ariaLabel={t("release3904.toggle-account-visibility")}
                        revealTooltip={t("release3904.click-to-reveal-account")}
                        hideTooltip={t("release3904.click-to-hide-account")}
                        className="max-w-full truncate"
                      />
                    </span>
                  ) : (
                    t("release3904.unsupported-secret", { kind: config.kind })
                  )
                }
                control={
                  !readOnly ? (
                    <div className="flex items-center gap-1">
                      {kind ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setDialog({ mode: "edit", id })}
                        >
                          {t("web.dynamic.GitActionsControl.edit")}
                        </Button>
                      ) : null}
                      <RemoveSecretProviderButton
                        label={config.label}
                        onConfirm={() => updateSettings({ secretProviders: { [id]: null } })}
                      />
                    </div>
                  ) : null
                }
              />
            );
          })
        )}
      </SettingsSection>
      {dialog !== null && !readOnly && (dialog.mode === "add" || editing !== undefined) ? (
        <SecretProviderDialog
          onClose={() => setDialog(null)}
          environmentId={environmentId}
          environmentLabel={environment.label}
          existingIds={new Set(Object.keys(providers))}
          {...(editing === undefined ? {} : { existing: editing })}
        />
      ) : null}
    </>
  );
}

function RemoveSecretProviderButton({
  label,
  onConfirm,
}: {
  readonly label: string;
  readonly onConfirm: () => void;
}) {
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="xs" variant="ghost" onClick={() => setOpen(true)}>
        {t("web.dynamic.CliCommandSettingsRow.remove")}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("release3904.remove-secret", { name: label })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("release3904.remove-secret-detail", { name: label })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {t("web.remaining.ServerBrowserSurface.cancel")}
            </AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {t("release3904.remove-provider")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
