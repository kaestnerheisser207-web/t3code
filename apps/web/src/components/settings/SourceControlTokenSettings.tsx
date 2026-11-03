import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import {
  isSecretReference,
  type EnvironmentId,
  type SecretReference,
  type SettingsSecretValue,
} from "@t3tools/contracts";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";

import { useEnvironmentSettings } from "../../hooks/useSettings";
import {
  readHostCredentialSettings,
  type SourceControlDefinition,
  type SourceControlHostCredentials,
} from "@t3tools/client-runtime/source-control-clients";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button, InlineButton } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SecretSourceInput, useSecretSources } from "./SecretSourceInput";

const hasToken = (token: SettingsSecretValue | undefined) =>
  typeof token === "string" ? token.length > 0 : token !== undefined;

export function SourceControlTokenSettings({
  environmentId,
  definition,
  credentials,
  onSaved,
}: {
  readonly environmentId: EnvironmentId;
  readonly definition: SourceControlDefinition;
  readonly credentials: SourceControlHostCredentials;
  readonly onSaved: () => void;
}) {
  const t = useTranslate();
  const { tokens } = useEnvironmentSettings(environmentId, (settings) =>
    readHostCredentialSettings(settings, definition.kind),
  );
  const updateSettings = useAtomCommand(serverEnvironment.updateSettings, {
    label: `save ${definition.label} token`,
  });
  const defaultHost = definition.publicHost ?? "";
  const [host, setHost] = useState(defaultHost);
  const secretSources = useSecretSources(environmentId);
  const [pending, setPending] = useState<{
    readonly key: string;
    readonly draft: string | SecretReference;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const normalizedHost = host.trim().toLowerCase();
  const savedToken = tokens[normalizedHost];
  const isSaved = hasToken(savedToken);
  const savedHosts = Object.entries(tokens)
    .filter(([, value]) => hasToken(value))
    .map(([saved]) => saved);
  const sourceKey = JSON.stringify([normalizedHost, savedToken ?? ""]);
  const draft =
    pending?.key === sourceKey ? pending.draft : isSecretReference(savedToken) ? savedToken : "";
  const submission = typeof draft === "string" ? draft.trim() : draft;

  const save = async (target: string, token: SettingsSecretValue) => {
    setSaving(true);
    const result = await updateSettings({
      environmentId,
      // Send the whole map; other tokens' redaction markers preserve their values.
      input: {
        patch: {
          sourceControlHosts: { [definition.kind]: { tokens: { ...tokens, [target]: token } } },
        },
      },
    });
    setSaving(false);
    if (result._tag === "Success") {
      setPending(null);
      onSaved();
    }
  };

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (normalizedHost && submission !== "") void save(normalizedHost, submission);
      }}
    >
      {/* Locked while saving: a successful save clears the draft, which would drop edits made mid-request. */}
      <fieldset disabled={saving} className="contents">
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
          <Trans
            t={t}
            i18nKey="web.rich.SourceControlTokenSettings.a-token-saved-here-is-used-before-part-and-the-part-login-so-part-works-without-the-part-give-it-part-part"
            components={{
              part0: (
                <code className="rounded bg-muted px-1 py-px text-2xs">
                  {credentials.tokenEnvVar}
                </code>
              ),
              part1: (
                <code className="rounded bg-muted px-1 py-px text-2xs">{credentials.cliName}</code>
              ),
              value2: <>{definition.label}</>,
              value3: <>{credentials.cliLabel}</>,
              value4: <>{credentials.tokenAccess}</>,
              value5: (
                <>
                  {normalizedHost || defaultHost ? (
                    <InlineButton
                      render={
                        <a
                          href={credentials.newTokenUrl(normalizedHost || defaultHost)}
                          target="_blank"
                          rel="noreferrer noopener"
                        />
                      }
                    >
                      {t("settings.pages.SourceControlTokenSettings.create-a-token")}
                      <ExternalLinkIcon aria-hidden className="size-3" />
                    </InlineButton>
                  ) : null}
                </>
              ),
            }}
          />
        </p>
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
          <div className="grid gap-1.5">
            <Label htmlFor={`${definition.kind}-token-host-${environmentId}`}>
              {t("settings.pages.SourceControlTokenSettings.host")}
            </Label>
            <Input
              id={`${definition.kind}-token-host-${environmentId}`}
              autoComplete="off"
              size="sm"
              placeholder={defaultHost}
              value={host}
              onChange={(event) => setHost(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${definition.kind}-token-${environmentId}`}>
              {t("settings.pages.SourceControlTokenSettings.token")}
            </Label>
            <SecretSourceInput
              id={`${definition.kind}-token-${environmentId}`}
              size="sm"
              aria-label={`${definition.label} token`}
              configured={isSaved && !isSecretReference(savedToken)}
              value={draft}
              sources={secretSources}
              onChange={(event) => setPending({ key: sourceKey, draft: event.target.value })}
              onSecretChange={(secret) => setPending({ key: sourceKey, draft: secret ?? "" })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {savedHosts.length === 0
              ? t(
                  "web.dynamic.SourceControlTokenSettings.no-token-saved-the-server-uses-param-or-the-param-login",
                  { tokenEnvVar: credentials.tokenEnvVar, cliName: credentials.cliName },
                )
              : t("web.dynamic.SourceControlTokenSettings.saved-for-param", {
                  value: savedHosts.join(", "),
                })}
          </p>
          <div className="flex shrink-0 gap-2">
            {isSaved ? (
              <Button
                size="xs"
                variant="outline"
                disabled={saving}
                onClick={() => void save(normalizedHost, "")}
              >
                {t("settings.pages.SourceControlTokenSettings.remove")}
              </Button>
            ) : null}
            <Button
              type="submit"
              size="xs"
              disabled={!normalizedHost || submission === "" || saving}
            >
              {t("settings.pages.SourceControlTokenSettings.save")}
            </Button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
