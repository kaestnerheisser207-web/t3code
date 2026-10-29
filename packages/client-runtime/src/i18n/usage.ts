import type { TFunction } from "i18next";

export function usageAccessibilityLabel(
  t: TFunction,
  input: {
    readonly index?: number;
    readonly account: string;
    readonly remaining: number;
    readonly resetsIn?: string | null | undefined;
    readonly timeLeft?: number | null | undefined;
    readonly credits?: number | null | undefined;
  },
) {
  return [
    input.index === undefined
      ? t("usage.accessibility.accountRemaining", {
          account: input.account,
          remaining: input.remaining,
        })
      : t("usage.accessibility.segmentRemaining", {
          index: input.index,
          account: input.account,
          remaining: input.remaining,
        }),
    input.resetsIn || null,
    input.timeLeft == null
      ? null
      : t("usage.accessibility.windowRemaining", { percent: input.timeLeft }),
    input.credits ? t("usage.accessibility.banked", { count: input.credits }) : null,
  ]
    .filter((part) => part !== null)
    .join(t("usage.accessibility.separator"));
}
