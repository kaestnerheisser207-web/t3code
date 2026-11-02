import { managedPolicyText } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../i18n";
import type { ManagedPolicySummary } from "@t3tools/contracts";
import { BuildingIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

/**
 * A control an administrator's policy turns off: shown inert, with the policy's reason on hover
 * and focus. Without a reason it renders the control untouched.
 */
export function ManagedControl({
  reason,
  children,
}: {
  reason: string | undefined;
  children: ReactNode;
}) {
  const t = useTranslate();
  if (reason === undefined) return children;
  const localizedReason = managedPolicyText(t, reason);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            role="group"
            aria-disabled="true"
            aria-label={localizedReason}
            className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          />
        }
      >
        <span inert className="inline-flex opacity-50">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipPopup side="top">{localizedReason}</TooltipPopup>
    </Tooltip>
  );
}

/** One line of policy text with the building mark, for places a whole feature is managed. */
export function ManagedNotice({ children }: { children: ReactNode }) {
  const t = useTranslate();
  return (
    <p className="flex items-start gap-2 text-muted-foreground text-xs leading-relaxed">
      <BuildingIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{typeof children === "string" ? managedPolicyText(t, children) : children}</span>
    </p>
  );
}

/** "This environment is managed by <organization>", linking the support page when there is one. */
export function ManagedByOrganization({ policy }: { policy: ManagedPolicySummary }) {
  const t = useTranslate();

  return (
    <ManagedNotice>
      {t("release4066.policy.managedBy", { organization: policy.organization })}
      {policy.supportUrl ? (
        <>
          {" "}
          <a
            href={policy.supportUrl}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            {t("release4066.text064")}
          </a>
        </>
      ) : null}
    </ManagedNotice>
  );
}
