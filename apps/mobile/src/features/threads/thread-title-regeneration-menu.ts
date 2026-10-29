import type { TFunction } from "i18next";
import type { MenuAction } from "@react-native-menu/menu";

export function buildThreadTitleRegenerationMenuItems(
  input: {
    readonly supported: boolean;
    readonly isRegenerating: boolean;
  },
  t?: TFunction,
): MenuAction[] {
  if (!input.supported) return [];

  return [
    {
      id: "regenerate-title",
      title:
        t?.(input.isRegenerating ? "thread.title.regenerating" : "thread.title.regenerate") ??
        (input.isRegenerating ? "Regenerating…" : "Regenerate title"),
      image: "arrow.clockwise",
      ...(input.isRegenerating ? { attributes: { disabled: true } } : {}),
    },
  ];
}
