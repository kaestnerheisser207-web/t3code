import { useTranslate } from "../../i18n";
import { useState } from "react";

import { isLocalEnvironmentDisabled } from "../../localEnvironment";
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
import { Spinner } from "../ui/spinner";
import { Switch } from "../ui/switch";
import { SettingsRow } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

// Toggling relaunches desktop; the switch reflects startup state.
export function LocalEnvironmentSetting() {
  const t = useTranslate();
  const setEnabled = window.desktopBridge?.setLocalEnvironmentEnabled;
  const [enabled] = useState(() => !isLocalEnvironmentDisabled());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!setEnabled) return null;

  const applyChange = async () => {
    setIsUpdating(true);
    setError(null);
    try {
      await setEnabled(!enabled);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't change this setting.");
      setIsUpdating(false);
    }
  };

  return (
    <>
      <SettingsRow
        {...searchableSetting("local-environment")}
        description={
          enabled
            ? t(
                "web.dynamic.LocalEnvironmentSetting.run-agents-on-this-computer-turn-off-to-use-t3-code-only-with-remote-environments",
              )
            : t(
                "web.dynamic.LocalEnvironmentSetting.turned-off-agents-only-run-in-remote-environments",
              )
        }
        control={
          <Switch
            checked={enabled}
            disabled={isUpdating}
            onCheckedChange={() => setConfirmOpen(true)}
            aria-label={t("settings.pages.LocalEnvironmentSetting.local-environment")}
          />
        }
      />
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (isUpdating) return;
          setConfirmOpen(open);
          if (!open) setError(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {enabled
                ? t("web.dynamic.LocalEnvironmentSetting.turn-off-local-environment")
                : t("web.dynamic.LocalEnvironmentSetting.turn-on-local-environment")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {enabled
                ? t(
                    "web.dynamic.LocalEnvironmentSetting.t3-code-will-restart-without-running-a-server-on-this-computer-any-agents-and-terminals-running-here-will-stop-and-other-devices-will-no-longer-be-able-to-connect-to-this-computer-your-projects-history-and-remote-environments-are-unaffected",
                  )
                : t(
                    "web.dynamic.LocalEnvironmentSetting.t3-code-will-restart-and-start-running-a-server-on-this-computer-again",
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="px-6 pb-4 text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogClose disabled={isUpdating} render={<Button variant="outline" />}>
              {t("settings.pages.LocalEnvironmentSetting.cancel")}
            </AlertDialogClose>
            <Button
              variant={enabled ? "destructive" : t("web.dynamic.EnvironmentIconPicker.default")}
              disabled={isUpdating}
              onClick={() => void applyChange()}
            >
              {isUpdating ? (
                <>
                  <Spinner size="sm" />
                  {t("settings.pages.LocalEnvironmentSetting.restarting")}
                </>
              ) : enabled ? (
                t("web.dynamic.LocalEnvironmentSetting.restart-and-turn-off")
              ) : (
                t("web.dynamic.LocalEnvironmentSetting.restart-and-turn-on")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
