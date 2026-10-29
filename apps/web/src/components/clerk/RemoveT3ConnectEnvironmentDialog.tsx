import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import { useState } from "react";

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
  onCancel,
  onConfirm,
}: {
  readonly environmentLabel: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const t = useTranslate();
  const accountPage = useT3ConnectAccountPage();
  const [shownLabel, setShownLabel] = useState(environmentLabel);
  if (environmentLabel !== null && environmentLabel !== shownLabel) setShownLabel(environmentLabel);
  const openAccountPage = accountPage.open;

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
              <Trans
                t={t}
                i18nKey="web.rich.RemoveT3ConnectEnvironmentDialog.remove-part-from-this-device"
                components={{ value0: <>{shownLabel}</> }}
              />
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "web.ui.RemoveT3ConnectEnvironmentDialog.this-forgets-its-pairing-credentials-and-cached-threads-here",
              )}
            </AlertDialogDescription>
            <AlertDialogDescription>
              <Trans
                t={t}
                i18nKey="web.rich.RemoveT3ConnectEnvironmentDialog.it-stays-on-your-t3-connect-account-and-keeps-its-host-space-deregister-it-in-part-to-free-it"
                components={{
                  value0: (
                    <>
                      {openAccountPage ? (
                        <InlineButton
                          onClick={() => {
                            onCancel();
                            openAccountPage();
                          }}
                        >
                          {t("web.ui.RemoveT3ConnectEnvironmentDialog.t3-connect-settings")}
                        </InlineButton>
                      ) : (
                        t("web.dynamic.RemoveT3ConnectEnvironmentDialog.t3-connect-settings")
                      )}
                    </>
                  ),
                }}
              />
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
