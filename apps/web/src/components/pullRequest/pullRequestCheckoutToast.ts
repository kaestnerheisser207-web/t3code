import type { TFunction } from "i18next";
import { sourceControlTerm } from "@t3tools/client-runtime/i18n";
import type { ChangeRequestTerminology } from "@t3tools/client-runtime/source-control-clients";

export function offHeadPullRequestCheckoutToast(
  terminology: ChangeRequestTerminology,
  t?: TFunction,
) {
  return {
    type: "warning",
    title: t ? t("checkout.offHeadTitle") : "Checked out, but not confirmed on the latest commit",
    description: t
      ? t("checkout.offHeadDescription", { kind: sourceControlTerm(t, terminology.singular) })
      : `This checkout could not be confirmed at the ${terminology.singular}'s latest commit, so its code may differ. Local commits or uncommitted work keep a checkout where it is.`,
  } as const;
}
