import { useTranslate } from "../../i18n";
import type { EnvironmentId, SecretProviderConfig, SecretProviderId } from "@t3tools/contracts";
import * as Result from "effect/Result";
import { useState } from "react";

import { useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  draftFromSecretProvider,
  secretProviderFromDraft,
  type SecretProviderDraft,
} from "./SecretProviderDialog.logic";

/** Mounted per open, so each open starts from a fresh draft. */
export function SecretProviderDialog({
  onClose,
  environmentId,
  environmentLabel,
  existingIds,
  existing,
}: {
  readonly onClose: () => void;
  readonly environmentId: EnvironmentId;
  readonly environmentLabel: string;
  readonly existingIds: ReadonlySet<string>;
  readonly existing?: { readonly id: SecretProviderId; readonly config: SecretProviderConfig };
}) {
  const t = useTranslate();
  const updateSettings = useUpdateEnvironmentSettings(environmentId);
  const [draft, setDraft] = useState<SecretProviderDraft>(
    existing ? draftFromSecretProvider(existing.config) : { name: "", account: "" },
  );
  const [submitted, setSubmitted] = useState(false);
  const result = secretProviderFromDraft(
    draft,
    existingIds,
    existing ? { mode: "edit", id: existing.id } : { mode: "add" },
    t,
  );
  const issues = Result.isFailure(result) ? result.failure : {};
  const nameError = submitted ? issues.name : undefined;
  const accountError = submitted ? issues.account : undefined;

  const update = (patch: Partial<SecretProviderDraft>) => setDraft({ ...draft, ...patch });
  const save = () => {
    setSubmitted(true);
    if (Result.isFailure(result)) return;
    updateSettings({ secretProviders: { [result.success.id]: result.success.config } });
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existing
              ? t("release3904.edit-secret", { name: existing.config.label })
              : t("release3904.add-a-1password-provider")}
          </DialogTitle>
          <DialogDescription>
            {t("release3904.secret-description", { environment: environmentLabel })}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <form
            id="secret-provider-form"
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="secret-provider-name">{t("web.ui.projectScriptEditor.name")}</Label>
              <Input
                id="secret-provider-name"
                placeholder="Personal"
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
                maxLength={64}
                aria-invalid={nameError !== undefined}
                aria-describedby={
                  nameError !== undefined ? "secret-provider-name-error" : undefined
                }
                autoFocus
              />
              {nameError !== undefined ? (
                <p
                  id="secret-provider-name-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {nameError}
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="secret-provider-account">
                {t("settings.pages.SourceControlAccountSettings.account")}
              </Label>
              <Input
                id="secret-provider-account"
                placeholder="my.1password.com"
                value={draft.account}
                onChange={(event) => update({ account: event.target.value })}
                maxLength={253}
                spellCheck={false}
                aria-invalid={accountError !== undefined}
                aria-describedby={
                  accountError !== undefined ? "secret-provider-account-error" : undefined
                }
              />
              {accountError !== undefined ? (
                <p
                  id="secret-provider-account-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {accountError}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {t(
                  "release3904.the-account-shorthand-sign-in-address-without-https-or-id-that-op-account-list-shows",
                )}
              </p>
            </div>
          </form>
        </DialogPanel>
        <DialogFooter variant="bare">
          <Button variant="outline" onClick={onClose}>
            {t("web.remaining.ServerBrowserSurface.cancel")}
          </Button>
          <Button
            type="submit"
            form="secret-provider-form"
            disabled={submitted && Result.isFailure(result)}
          >
            {existing
              ? t("web.dynamic.UsagePriceOverrides.save-changes")
              : t("release3904.add-provider")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
