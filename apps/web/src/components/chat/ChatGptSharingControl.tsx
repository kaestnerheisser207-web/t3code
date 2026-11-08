import { useTranslate } from "../../i18n";
import { usesChatGptSharing } from "@t3tools/shared/usageLimits";
import type { ServerProvider } from "@t3tools/contracts";
import { useId } from "react";
import { OpenAI } from "../Icons";
import { ChatGptUsageButton } from "../settings/ChatGptUsageButton";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function ChatGptSharingControl({ provider }: { provider: ServerProvider | null }) {
  const t = useTranslate();
  const speedNoticeId = useId();
  const speedNotice = t("release4340.chatgpt-speed-notice");
  if (!usesChatGptSharing(provider)) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-t px-3 py-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              aria-describedby={speedNoticeId}
              tabIndex={0}
              className="flex items-center gap-2 rounded-sm text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            />
          }
        >
          <OpenAI className="size-3.5" aria-hidden="true" />
          {t("web.ui.ChatGptSharingControl.using-chatgpt-plan")}
        </TooltipTrigger>
        <span id={speedNoticeId} className="sr-only">
          {speedNotice}
        </span>
        <TooltipPopup side="top">{speedNotice}</TooltipPopup>
      </Tooltip>
      <ChatGptUsageButton size="xs" />
    </div>
  );
}
