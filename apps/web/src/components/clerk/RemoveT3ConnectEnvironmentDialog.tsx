import { Discovery } from "@t3tools/client-runtime/relay";
import type { EnvironmentId } from "@t3tools/contracts";
import { useTranslate } from "../../i18n";
import { useState } from "react";

import { useRelayEnvironmentDiscovery } from "../../state/environments";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button, InlineButton } from "../ui/button";
import { useT3ConnectAccountPage } from "./T3ConnectAccountPages";

export function RemoveT3ConnectEnvironmentDialog({
  environmentLabel,
  environmentId,
  onCancel,
  onConfirm,
}: {
  readonly environmentLabel: string | null;
  readonly environmentId: EnvironmentId | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const t = useTranslate();
  const accountPage = useT3ConnectAccountPage();
  const discovery = useRelayEnvironmentDiscovery();
  const registration = environmentId
    ? Discovery.relayEnvironmentRegistration(discovery, environmentId)
    : "unknown";
  const [shown, setShown] = useState({ label: environmentLabel, registration });
  if (
    environmentLabel !== null &&
    (environmentLabel !== shown.label || registration !== shown.registration)
  ) {
    setShown({ label: environmentLabel, registration });
  }
  const openAccountPage = accountPage.open;
  const accountPageLink = openAccountPage ? (
    <InlineButton
      onClick={() => {
        onCancel();
        openAccountPage();
      }}
    >
      {t("web.ui.RemoveT3ConnectEnvironmentDialog.t3-connect-settings")}
    </InlineButton>
  ) : (
    t("web.ui.RemoveT3ConnectEnvironmentDialog.t3-connect-settings")
  );

  return (
    <>
      <AlertDialog
        open={environmentLabel !== null}
        onOpenChange={(open) => {
          if (!open) onCancel();
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("mobile.threads.ThreadQueueControl.remove")} {shown.label} from this device?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "web.ui.RemoveT3ConnectEnvironmentDialog.this-forgets-its-pairing-credentials-and-cached-threads-here",
              )}
            </AlertDialogDescription>
            <AlertDialogDescription>
              {shown.registration === "registered" ? (
                <>
                  It stays on your T3 Connect account and keeps its host space. Deregister it in{" "}
                  {accountPageLink} to free it.
                </>
              ) : shown.registration === "unregistered" ? (
                "It's no longer on your T3 Connect account."
              ) : (
                <>
                  This doesn't change your T3 Connect account. To deregister it there, use{" "}
                  {accountPageLink}.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {t("web.ui.RemoveT3ConnectEnvironmentDialog.cancel")}
            </AlertDialogClose>
            <Button variant="destructive" onClick={onConfirm}>
              {t("web.ui.RemoveT3ConnectEnvironmentDialog.remove-from-this-device")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
      {accountPage.portals}
    </>
  );
}
