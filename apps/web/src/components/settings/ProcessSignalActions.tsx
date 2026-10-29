import { useTranslate } from "../../i18n";
import type { ServerProcessSignal } from "@t3tools/contracts";

import { InlineButton } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function ProcessSignalActions({
  disabled,
  onSignal,
}: {
  disabled: boolean;
  onSignal: (signal: ServerProcessSignal) => void;
}) {
  const t = useTranslate();
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Tooltip>
        <TooltipTrigger
          render={
            <InlineButton
              disabled={disabled}
              aria-label={t("settings.pages.ProcessSignalActions.send-sigint")}
              tone="muted"
              onClick={() => onSignal("SIGINT")}
            >
              {t("settings.pages.ProcessSignalActions.int")}
            </InlineButton>
          }
        />
        <TooltipPopup side="top">
          {t("settings.pages.ProcessSignalActions.send-sigint")}
        </TooltipPopup>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <InlineButton
              disabled={disabled}
              aria-label={t("settings.pages.ProcessSignalActions.send-sigkill")}
              tone="destructive"
              onClick={() => onSignal("SIGKILL")}
            >
              {t("settings.pages.ProcessSignalActions.kill")}
            </InlineButton>
          }
        />
        <TooltipPopup side="top">
          {t("settings.pages.ProcessSignalActions.send-sigkill")}
        </TooltipPopup>
      </Tooltip>
    </div>
  );
}
