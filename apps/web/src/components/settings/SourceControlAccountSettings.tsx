import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import type { EnvironmentId, SourceControlProviderAuth } from "@t3tools/contracts";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

import { useEnvironmentSettings } from "../../hooks/useSettings";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { groupHostAccounts, nextHostAccountChoices } from "./SourceControlAccountSettings.logic";
import {
  readHostCredentialSettings,
  type SourceControlDefinition,
  type SourceControlHostCredentials,
} from "@t3tools/client-runtime/source-control-clients";
import { redactedPlaceholder } from "./RedactedSensitiveText";

/** Sentinel select value for "follow the CLI's active login"; logins never contain spaces. */
const ACTIVE_ACCOUNT = "active cli account";

function RedactedLogin(props: {
  readonly account: string;
  readonly revealed: boolean;
  readonly label?: string;
}) {
  const t = useTranslate();
  return props.revealed ? (
    <span className="min-w-0 truncate font-mono text-2xs">{props.account}</span>
  ) : (
    <span className="min-w-0 truncate font-mono text-2xs">
      <span className="select-none blur-xs" aria-hidden>
        {redactedPlaceholder(props.account)}
      </span>
      <span className="sr-only">
        {props.label ?? t("web.dynamic.SourceControlAccountSettings.hidden-account")}
      </span>
    </span>
  );
}

export function SourceControlAccountSettings({
  environmentId,
  definition,
  credentials,
  auth,
  onSaved,
}: {
  readonly environmentId: EnvironmentId;
  readonly definition: SourceControlDefinition;
  readonly credentials: SourceControlHostCredentials;
  readonly auth: SourceControlProviderAuth;
  readonly onSaved: () => void;
}) {
  const t = useTranslate();
  const { hosts } = useEnvironmentSettings(environmentId, (settings) =>
    readHostCredentialSettings(settings, definition.kind),
  );
  const { label } = definition;
  const { cliName } = credentials;
  const updateSettings = useAtomCommand(serverEnvironment.updateSettings, {
    label: `save ${label} account settings`,
  });
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const groups = groupHostAccounts(auth.accounts ?? []);

  const save = async (
    host: string,
    change: { readonly enabled?: boolean; readonly account?: string | null },
  ) => {
    setSaving(true);
    const result = await updateSettings({
      environmentId,
      input: {
        patch: {
          sourceControlHosts: {
            [definition.kind]: { hosts: nextHostAccountChoices(hosts, host, change) },
          },
        },
      },
    });
    setSaving(false);
    if (result._tag === "Success") onSaved();
  };

  if (groups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        <Trans
          t={t}
          i18nKey="web.rich.SourceControlAccountSettings.sign-in-with-part-on-the-server-host-then-rescan-to-choose-accounts-here"
          components={{
            part0: (
              <code className="rounded bg-muted px-1 py-px text-2xs">
                {credentials.loginCommand}
              </code>
            ),
          }}
        />
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
          <Trans
            t={t}
            i18nKey="web.rich.SourceControlAccountSettings.choose-which-part-login-each-part-host-uses-or-turn-a-host-off"
            components={{
              part0: <code className="rounded bg-muted px-1 py-px text-2xs">{cliName}</code>,
              value1: <>{label}</>,
            }}
          />
        </p>
        <Button
          size="icon-xs"
          variant="ghost-muted"
          onClick={() => setRevealed((current) => !current)}
          aria-label={
            revealed
              ? t("web.dynamic.SourceControlAccountSettings.hide-param-accounts", { label: label })
              : t("web.dynamic.SourceControlAccountSettings.reveal-param-accounts", {
                  label: label,
                })
          }
          aria-pressed={revealed}
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>
      {groups.map((group) => {
        const choice = hosts[group.host];
        const enabled = choice?.enabled ?? true;
        const stalePin =
          choice?.account !== undefined && !group.selectable.includes(choice.account);
        const pinned = choice?.account !== undefined && !stalePin ? choice.account : ACTIVE_ACCOUNT;
        return (
          <div key={group.host} className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <span className="text-xs font-medium text-foreground">{group.host}</span>
                {group.selectable.length === 1 && group.selectable[0] !== undefined ? (
                  <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <span>{t("settings.pages.SourceControlAccountSettings.signed-in-as")}</span>
                    <RedactedLogin revealed={revealed} account={group.selectable[0]} />
                  </p>
                ) : null}
              </div>
              <Switch
                checked={enabled}
                disabled={saving}
                aria-label={t("web.dynamic.SourceControlAccountSettings.use-param-on-param", {
                  label: label,
                  host: group.host,
                })}
                onCheckedChange={(checked) => void save(group.host, { enabled: checked })}
              />
            </div>
            {group.selectable.length > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {t("settings.pages.SourceControlAccountSettings.account")}
                </span>
                <div className="w-64 max-w-full">
                  <Select
                    value={pinned}
                    disabled={saving || !enabled}
                    onValueChange={(value) => {
                      if (typeof value !== "string") return;
                      void save(group.host, {
                        account: value === ACTIVE_ACCOUNT ? null : value,
                      });
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={t(
                        "web.dynamic.SourceControlAccountSettings.param-account-for-param",
                        { label: label, host: group.host },
                      )}
                    >
                      <SelectValue>
                        {(value: string) =>
                          value === ACTIVE_ACCOUNT ? (
                            <span className="flex min-w-0 items-center gap-1">
                              <Trans
                                t={t}
                                i18nKey="web.rich.SourceControlAccountSettings.active-part-account-part"
                                components={{
                                  value0: <>{cliName}</>,
                                  value1: (
                                    <>
                                      {group.activeAccount ? (
                                        <>
                                          (
                                          <RedactedLogin
                                            revealed={revealed}
                                            account={group.activeAccount}
                                          />
                                          )
                                        </>
                                      ) : null}
                                    </>
                                  ),
                                }}
                              />
                            </span>
                          ) : (
                            <RedactedLogin revealed={revealed} account={value} />
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPopup align="end" alignItemWithTrigger={false}>
                      <SelectItem value={ACTIVE_ACCOUNT}>
                        <Trans
                          t={t}
                          i18nKey="web.rich.SourceControlAccountSettings.part-active-part-account-part-part"
                          components={{
                            part0: <span className="flex min-w-0 items-center gap-1">{null}</span>,
                            value1: <>{cliName}</>,
                            value2: (
                              <>
                                {group.activeAccount ? (
                                  <>
                                    (
                                    <RedactedLogin
                                      revealed={revealed}
                                      account={group.activeAccount}
                                    />
                                    )
                                  </>
                                ) : null}
                              </>
                            ),
                          }}
                        />
                      </SelectItem>
                      {group.selectable.map((account, index) => (
                        <SelectItem key={account} value={account}>
                          <RedactedLogin
                            revealed={revealed}
                            account={account}
                            label={t("web.dynamic.SourceControlAccountSettings.account-param", {
                              value: index + 1,
                            })}
                          />
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
              </div>
            ) : null}
            {stalePin ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-warning">
                  <Trans
                    t={t}
                    i18nKey="web.rich.SourceControlAccountSettings.the-chosen-login-is-no-longer-signed-in-so-the-active-part-login-is-used"
                    components={{ value0: <>{cliName}</> }}
                  />
                </p>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void save(group.host, { account: null })}
                >
                  {t("settings.pages.SourceControlAccountSettings.use-active-login")}
                </Button>
              </div>
            ) : null}
            {group.broken.map((entry) => (
              <p
                key={entry.account}
                className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground/70"
              >
                <Trans
                  t={t}
                  i18nKey="web.rich.SourceControlAccountSettings.part-part-can-t-be-used-part-part"
                  components={{
                    part0: <RedactedLogin revealed={revealed} account={entry.account} />,
                    part1: <span>{null}</span>,
                    value2: (
                      <>
                        {entry.error ??
                          t(
                            "web.dynamic.SourceControlAccountSettings.param-reports-this-login-as-invalid",
                            { cliName: cliName },
                          )}
                      </>
                    ),
                  }}
                />
              </p>
            ))}
            {group.environmentVariable ? (
              <p className="text-xs text-warning">
                <Trans
                  t={t}
                  i18nKey="web.rich.SourceControlAccountSettings.part-is-set-on-the-server-so-it-overrides-the-account-chosen-here-until-it-is-unset"
                  components={{ value0: <>{group.environmentVariable}</> }}
                />
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
