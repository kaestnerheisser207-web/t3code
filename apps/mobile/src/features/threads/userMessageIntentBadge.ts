import { mobileI18n } from "../../i18n";
import type { OrchestrationV2UserMessageInputIntent } from "@t3tools/contracts";

export interface UserMessageIntentBadgePresentation {
  readonly label: string;
  readonly accessibilityLabel: string;
}

export function resolveUserMessageIntentBadge(
  intent: OrchestrationV2UserMessageInputIntent | undefined,
  unread = false,
): UserMessageIntentBadgePresentation | null {
  if (unread && (intent === "steer" || intent === "promoted_queued_to_steer")) {
    return {
      label: mobileI18n.t("release4491.text233"),
      accessibilityLabel: mobileI18n.t("release4491.text234"),
    };
  }
  switch (intent) {
    case "steer":
      return {
        label: mobileI18n.t("settings.items.follow-up-behavior.text.steer"),
        accessibilityLabel: mobileI18n.t(
          "web.dynamic.TimelineUserMessageRow.steered-the-active-turn",
        ),
      };
    case "promoted_queued_to_steer":
      return {
        label: mobileI18n.t("settings.items.follow-up-behavior.text.steer"),
        accessibilityLabel: mobileI18n.t(
          "web.dynamic.TimelineUserMessageRow.originally-queued-then-promoted-to-steer-the-active-turn",
        ),
      };
    case "queued_turn":
    case "turn_start":
    case undefined:
      return null;
  }
}
