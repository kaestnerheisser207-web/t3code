import { webI18n } from "../../i18n";
import { EraserIcon } from "lucide-react";

import type { ComposerBannerStackItem } from "./ComposerBannerStack";

/** Shown while `/clear` is armed; dismissing it keeps the current conversation. */
export function freshSessionBannerItem(onUndo: () => void): ComposerBannerStackItem {
  return {
    id: "fresh-session",
    variant: "info",
    icon: <EraserIcon />,
    title: webI18n.t("release4262.your-next-message-starts-a-fresh-session"),
    description: webI18n.t("release4262.the-agent-won-t-see-earlier-messages-in-this-thr"),
    dismissLabel: webI18n.t("release4262.keep-the-current-session"),
    onDismiss: onUndo,
  };
}
