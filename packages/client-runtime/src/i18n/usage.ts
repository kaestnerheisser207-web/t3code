import type { TFunction } from "i18next";
import type { ServerProviderResetCredits } from "@t3tools/contracts";
import { formatDuration } from "@t3tools/shared/usageLimits";
import { usageReviewEn } from "./locales/usage-review.en.ts";

const textKeys = new Map<string, keyof typeof usageReviewEn>();
for (const key of Object.keys(usageReviewEn) as Array<keyof typeof usageReviewEn>) {
  if (!usageReviewEn[key].includes("{{")) textKeys.set(usageReviewEn[key], key);
}

for (const key of [
  "usageReview.pace-ahead",
  "usageReview.pace-on",
  "usageReview.pace-under",
] as const)
  textKeys.set(usageReviewEn[key].toLowerCase(), key);

export function usageText(t: TFunction, text: string): string {
  const key = textKeys.get(text);
  if (key) return t(key);
  if (text.startsWith(" · ")) return " · " + usageText(t, text.slice(3));
  if (/^\d+[dhm](?: \d+[dhm])*$/.test(text)) {
    return text
      .split(" ")
      .map((part) => {
        const count = Number(part.slice(0, -1));
        switch (part.at(-1)) {
          case "d":
            return t("usageReview.duration-days", { count });
          case "h":
            return t("usageReview.duration-hours", { count });
          default:
            return t("usageReview.duration-minutes", { count });
        }
      })
      .join(" ");
  }
  const relative = /^(resets in |in |↻ )(\d+[dhm](?: \d+[dhm])*)$/.exec(text);
  if (relative) {
    const duration = usageText(t, relative[2]!);
    return relative[1] === "↻ "
      ? `↻ ${duration}`
      : t(relative[1] === "in " ? "usageReview.relative-in" : "usageReview.resets-in", {
          duration,
        });
  }
  return text;
}

export function usageWindowLabel(t: TFunction, label: string): string {
  return label
    .split(" · ")
    .map((part) => usageText(t, part))
    .join(" · ");
}

export function usageResetCreditsSummary(
  t: TFunction,
  credits: ServerProviderResetCredits,
  now: number,
  compact = false,
): string {
  if (credits.availableCount === 0) return t("usageReview.reset-empty");
  const summary = t(compact ? "usageReview.credits-compact" : "usageReview.credits", {
    count: credits.availableCount,
  });
  if (!credits.nextExpiresAt) return summary;
  const duration = usageText(t, formatDuration(Date.parse(credits.nextExpiresAt) - now));
  return (
    summary +
    t(compact ? "usageReview.credits-compact-expiry" : "usageReview.credits-expiry", { duration })
  );
}

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
    input.resetsIn ? usageText(t, input.resetsIn) : null,
    input.timeLeft == null
      ? null
      : t("usage.accessibility.windowRemaining", { percent: input.timeLeft }),
    input.credits ? t("usage.accessibility.banked", { count: input.credits }) : null,
  ]
    .filter((part) => part !== null)
    .join(t("usage.accessibility.separator"));
}
