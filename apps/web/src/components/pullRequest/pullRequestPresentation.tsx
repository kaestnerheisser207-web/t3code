import type { TFunction } from "i18next";
import { useTranslate } from "../../i18n";
import { Spinner } from "~/components/ui/spinner";
import type {
  PullRequestActor,
  PullRequestCheck,
  PullRequestCheckStatus,
  PullRequestChecksState,
  PullRequestLabel,
  PullRequestMergeability,
  PullRequestReviewDecision,
  PullRequestState,
} from "@t3tools/contracts";
import { formatDiffCount } from "@t3tools/client-runtime/diff-count";
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleSlashIcon,
  CircleXIcon,
  UserCheckIcon,
  UserRoundIcon,
  UserRoundXIcon,
} from "lucide-react";
import { Children, type CSSProperties, isValidElement, type ReactNode, useState } from "react";

import { cn } from "~/lib/utils";

import { Badge } from "../ui/badge";
import { InlineButton } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import type { PullRequestReviewOutcome } from "./pullRequestDetail.logic";
import { pullRequestLabelColor } from "./pullRequestList.logic";
import {
  PULL_REQUEST_STATE_PRESENTATION,
  PullRequestGlyph,
  type PullRequestStatePresentation,
  type PullRequestGlyphIcon,
} from "./pullRequestIcons";

export function PullRequestLabelChip({
  label,
  size = "sm",
  className,
  children,
}: {
  label: Pick<PullRequestLabel, "name" | "color">;
  size?: "sm" | "default";
  className?: string;
  children?: ReactNode;
}) {
  const color = pullRequestLabelColor(label.color);
  return (
    <Badge
      size={size}
      variant={color ? "label" : "secondary"}
      className={cn("min-w-0 max-w-40 shrink justify-start", className)}
      {...(color ? { style: { "--label": color } as CSSProperties } : {})}
    >
      <span className="truncate">{label.name}</span>
      {children}
    </Badge>
  );
}

function reviewDecisionPresentation(decision: PullRequestReviewDecision, t: TFunction) {
  switch (decision) {
    case "approved":
      return {
        Icon: UserCheckIcon,
        label: t("pr.filters.approved"),
        toneClassName: CHECK_STATUS_PRESENTATION.success.toneClassName,
      };
    case "changes-requested":
      return {
        Icon: UserRoundXIcon,
        label: t("pr.filters.changesRequested"),
        toneClassName: "text-amber-600/90 dark:text-amber-400/80",
      };
    case "review-required":
      return {
        Icon: UserRoundIcon,
        label: t("pr.status.awaitingReview"),
        toneClassName: "text-muted-foreground/60",
      };
  }
}

export function PullRequestReviewDecisionGlyph({
  decision,
}: {
  decision: PullRequestReviewDecision;
}) {
  const t = useTranslate();
  const presentation = reviewDecisionPresentation(decision, t);
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
        <presentation.Icon aria-hidden className={cn("size-3.5", presentation.toneClassName)} />
        <span className="sr-only">{presentation.label}</span>
      </TooltipTrigger>
      <TooltipPopup>{presentation.label}</TooltipPopup>
    </Tooltip>
  );
}

export function resolvePullRequestState(
  input: {
    readonly state: PullRequestState;
    readonly isDraft: boolean;
  },
  t?: TFunction,
): PullRequestStatePresentation {
  const key = input.state === "open" && input.isDraft ? "draft" : input.state;
  const presentation = PULL_REQUEST_STATE_PRESENTATION[key];
  const labels = {
    open: "pr.filters.open",
    closed: "pr.filters.closed",
    merged: "pr.filters.merged",
    draft: "pr.status.draft",
  } as const;
  return t ? { ...presentation, label: t(labels[key]) } : presentation;
}

export interface PullRequestConflictPresentation {
  readonly label: string;
  readonly toneClassName: string;
  readonly Icon: PullRequestGlyphIcon;
}

function resolvePullRequestConflict(input: {
  readonly state: PullRequestState;
  readonly isDraft: boolean;
  readonly mergeability?: PullRequestMergeability;
  readonly baseBranch?: string;
}): PullRequestConflictPresentation | null {
  if (input.state !== "open" || input.isDraft || input.mergeability !== "conflicting") {
    return null;
  }
  return {
    label: input.baseBranch ? `Conflicts with ${input.baseBranch}` : "Has conflicts",
    toneClassName: "text-destructive",
    Icon: PullRequestGlyph.conflicting,
  };
}

export function PullRequestStateGlyph({
  state,
  isDraft,
  className,
}: {
  state: PullRequestState;
  isDraft: boolean;
  className?: string;
}) {
  const t = useTranslate();
  const presentation = resolvePullRequestState({ state, isDraft }, t);
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
        <presentation.Icon
          role="img"
          aria-label={presentation.label}
          className={cn("size-4 shrink-0", presentation.toneClassName, className)}
        />
      </TooltipTrigger>
      <TooltipPopup>{presentation.label}</TooltipPopup>
    </Tooltip>
  );
}

export function PullRequestConflictGlyph({
  state,
  isDraft,
  mergeability,
  baseBranch,
  className,
}: {
  state: PullRequestState;
  isDraft: boolean;
  mergeability?: PullRequestMergeability;
  baseBranch?: string;
  className?: string;
}) {
  const presentation = resolvePullRequestConflict({
    state,
    isDraft,
    ...(mergeability === undefined ? {} : { mergeability }),
    ...(baseBranch === undefined ? {} : { baseBranch }),
  });
  if (presentation === null) return null;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
        <presentation.Icon
          role="img"
          aria-label={presentation.label}
          className={cn("size-4 shrink-0", presentation.toneClassName, className)}
        />
      </TooltipTrigger>
      <TooltipPopup>{presentation.label}</TooltipPopup>
    </Tooltip>
  );
}

const CHECK_STATUS_PRESENTATION = {
  pending: { label: "Running", Icon: Spinner, toneClassName: "text-amber-500" },
  "action-required": {
    label: "Awaiting action",
    Icon: CircleDotIcon,
    toneClassName: "text-amber-600 dark:text-amber-400/90",
  },
  success: {
    label: "Passed",
    Icon: CircleCheckIcon,
    toneClassName: "text-emerald-600 dark:text-emerald-300/90",
  },
  failure: { label: "Failed", Icon: CircleXIcon, toneClassName: "text-destructive" },
  cancelled: { label: "Cancelled", Icon: CircleXIcon, toneClassName: "text-destructive" },
  skipped: { label: "Skipped", Icon: CircleSlashIcon, toneClassName: "text-muted-foreground/70" },
  neutral: { label: "Neutral", Icon: CircleDashedIcon, toneClassName: "text-muted-foreground/70" },
} as const satisfies Record<
  PullRequestCheckStatus,
  { label: string; Icon: typeof CircleCheckIcon | typeof Spinner; toneClassName: string }
>;

function isWorkflowApprovalCheck(check: Pick<PullRequestCheck, "status" | "url">): boolean {
  return (
    check.status === "action-required" &&
    check.url !== null &&
    /\/actions\/runs\/\d+(?:\/|$)/u.test(check.url)
  );
}

export function pullRequestCheckStatusLabel(
  check: Pick<PullRequestCheck, "status" | "url">,
  t?: TFunction,
): string {
  if (t) {
    if (isWorkflowApprovalCheck(check)) return t("web.pr.checks.awaitingApproval");
    const keys = {
      pending: "web.ui.DeviceToolVersions.running",
      "action-required": "web.pr.checks.awaitingAction",
      success: "pr.status.passed",
      failure: "pr.status.failed",
      cancelled: "pr.status.cancelled",
      skipped: "pr.status.skipped",
      neutral: "pr.status.neutral",
    } as const;
    return t(keys[check.status]);
  }
  return isWorkflowApprovalCheck(check)
    ? "Awaiting approval"
    : CHECK_STATUS_PRESENTATION[check.status].label;
}

export function PullRequestCheckStatusIcon({ status }: { status: PullRequestCheckStatus }) {
  const presentation = CHECK_STATUS_PRESENTATION[status];
  return (
    <presentation.Icon
      aria-hidden
      className={cn("size-3.5 shrink-0", presentation.toneClassName)}
    />
  );
}

const CHECKS_STATE_PRESENTATION = {
  passing: {
    label: "All checks have passed",
    Icon: CircleCheckIcon,
    toneClassName: CHECK_STATUS_PRESENTATION.success.toneClassName,
  },
  failing: {
    label: "Some checks were not successful",
    Icon: CircleXIcon,
    toneClassName: "text-destructive",
  },
  pending: {
    label: "Some checks haven't completed yet",
    Icon: CircleDotIcon,
    toneClassName: "text-amber-600 dark:text-amber-400/90",
  },
} as const satisfies Record<
  PullRequestChecksState,
  { label: string; Icon: typeof CircleCheckIcon; toneClassName: string }
>;

export function pullRequestChecksStatePresentation(state: PullRequestChecksState, t?: TFunction) {
  const presentation = CHECKS_STATE_PRESENTATION[state];
  return t ? { ...presentation, label: t(`web.pr.checks.${state}`) } : presentation;
}

export function pullRequestChecksState(
  checks: ReadonlyArray<PullRequestCheck>,
): PullRequestChecksState | null {
  if (checks.length === 0) return null;
  const statuses = new Set(checks.map((check) => check.status));
  if (statuses.has("failure") || statuses.has("cancelled")) return "failing";
  if (statuses.has("pending") || statuses.has("action-required")) return "pending";
  return statuses.has("success") ? "passing" : null;
}

const REVIEW_OUTCOME_PRESENTATION = {
  approved: {
    label: "Approved",
    Icon: CircleCheckIcon,
    toneClassName: "text-emerald-600 dark:text-emerald-300/90",
    ringClassName: "ring-2 ring-emerald-500 dark:ring-emerald-400",
    staleRingClassName:
      "ring-2 ring-[color-mix(in_srgb,var(--color-emerald-500)_35%,var(--background))] dark:ring-[color-mix(in_srgb,var(--color-emerald-400)_35%,var(--background))]",
    fillClassName: "fill-emerald-500 dark:fill-emerald-400",
    badgeVariant: "success",
  },
  "changes-requested": {
    label: "Changes requested",
    Icon: CircleXIcon,
    toneClassName: "text-destructive",
    ringClassName: "ring-2 ring-destructive",
    staleRingClassName: "ring-2 ring-[color-mix(in_srgb,var(--destructive)_35%,var(--background))]",
    fillClassName: "fill-destructive",
    badgeVariant: "error",
  },
  dismissed: {
    label: "Review dismissed",
    Icon: CircleDashedIcon,
    toneClassName: "text-muted-foreground/70",
    ringClassName: "ring-2 ring-muted-foreground/60",
    staleRingClassName:
      "ring-2 ring-[color-mix(in_srgb,var(--contrast-muted-foreground)_30%,var(--background))]",
    fillClassName: "fill-muted-foreground",
    badgeVariant: "outline",
  },
} as const satisfies Record<
  PullRequestReviewOutcome,
  {
    label: string;
    Icon: typeof CircleCheckIcon;
    toneClassName: string;
    ringClassName: string;
    staleRingClassName: string;
    fillClassName: string;
    badgeVariant: "success" | "error" | "outline";
  }
>;

export function pullRequestReviewOutcomeToneClassName(outcome: PullRequestReviewOutcome): string {
  return REVIEW_OUTCOME_PRESENTATION[outcome].toneClassName;
}

// Mix rings with the background to prevent avatars showing through their overlap.
export function pullRequestReviewOutcomeRingClassName(
  outcome: PullRequestReviewOutcome,
  stale = false,
): string {
  const presentation = REVIEW_OUTCOME_PRESENTATION[outcome];
  return stale ? presentation.staleRingClassName : presentation.ringClassName;
}

export function pullRequestReviewOutcomeStaleLabel(
  outcome: PullRequestReviewOutcome,
  t?: TFunction,
): string {
  if (t) {
    const keys = {
      approved: "web.pr.review.staleApproved",
      "changes-requested": "web.pr.review.staleChanges",
      dismissed: "web.pr.review.staleDismissed",
    } as const;
    return t(keys[outcome]);
  }
  return `${REVIEW_OUTCOME_PRESENTATION[outcome].label} earlier changes`;
}

export function PullRequestReviewOutcomeIcon({
  outcome,
  className,
}: {
  outcome: PullRequestReviewOutcome;
  className?: string;
}) {
  const presentation = REVIEW_OUTCOME_PRESENTATION[outcome];
  return (
    <presentation.Icon
      aria-hidden
      className={cn("size-3.5 shrink-0", presentation.toneClassName, className)}
    />
  );
}

// Ring color alone blends into colorful bot avatars; the glyph gives each verdict a shape.
export function PullRequestReviewOutcomeAvatarBadge({
  outcome,
  stale = false,
}: {
  outcome: PullRequestReviewOutcome;
  stale?: boolean;
}) {
  const presentation = REVIEW_OUTCOME_PRESENTATION[outcome];
  return (
    <presentation.Icon
      aria-hidden
      strokeWidth={3}
      className={cn(
        "absolute -right-1 -bottom-1 size-3 text-background",
        presentation.fillClassName,
        stale && "opacity-50",
      )}
    />
  );
}

export function pullRequestReviewOutcomeLabel(
  outcome: PullRequestReviewOutcome,
  t?: TFunction,
): string {
  if (t) {
    const keys = {
      approved: "pr.filters.approved",
      "changes-requested": "pr.filters.changesRequested",
      dismissed: "web.pr.review.dismissed",
    } as const;
    return t(keys[outcome]);
  }
  return REVIEW_OUTCOME_PRESENTATION[outcome].label;
}

export function PullRequestReviewOutcomeBadge({
  outcome,
  className,
}: {
  outcome: PullRequestReviewOutcome;
  className?: string;
}) {
  const t = useTranslate();
  const presentation = REVIEW_OUTCOME_PRESENTATION[outcome];
  return (
    <Badge size="sm" variant={presentation.badgeVariant} className={className}>
      <span className="inline-flex items-baseline gap-1">
        <presentation.Icon aria-hidden className="size-3 self-center" />
        <span>{pullRequestReviewOutcomeLabel(outcome, t)}</span>
      </span>
    </Badge>
  );
}

export function PullRequestActorAvatar({
  actor,
  className,
}: {
  actor: PullRequestActor | null;
  className?: string;
}) {
  const login = actor?.login ?? "ghost";
  const avatarUrl = actor?.avatarUrl ?? null;
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  return avatarUrl === null || failedAvatarUrl === avatarUrl ? (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-3xs font-medium text-muted-foreground",
        className,
      )}
    >
      {login.slice(0, 1).toUpperCase()}
    </span>
  ) : (
    <img
      aria-hidden
      alt=""
      src={avatarUrl}
      loading="lazy"
      className={cn("size-4 shrink-0 rounded-full bg-muted object-cover", className)}
      onError={() => setFailedAvatarUrl(avatarUrl)}
    />
  );
}

export function PullRequestActorLabel({
  actor,
  className,
  variant = "label",
  tooltip = true,
  profileUrl,
}: {
  actor: PullRequestActor | null;
  className?: string;
  variant?: "label" | "avatar";
  tooltip?: boolean;
  profileUrl?: string | null;
}) {
  const t = useTranslate();
  const login = actor?.login ?? "ghost";
  const label = (
    <span className={cn("flex min-w-0 items-baseline", variant === "label" && "gap-1.5")}>
      <PullRequestActorAvatar actor={actor} className="self-center" />
      <span className={variant === "label" ? "truncate font-medium text-foreground" : "sr-only"}>
        {login}
      </span>
    </span>
  );
  const placement = cn("flex min-w-0 shrink", className);
  if (!tooltip) return <span className={placement}>{label}</span>;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          profileUrl ? (
            <InlineButton
              className={placement}
              render={
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("web.dynamic.pullRequestPresentation.open-param-s-profile", {
                    login: login,
                  })}
                />
              }
            />
          ) : (
            <span className={placement} />
          )
        }
      >
        {label}
      </TooltipTrigger>
      <TooltipPopup side="top">
        {actor?.name && actor.name !== login ? `${actor.name} (@${login})` : login}
        {profileUrl ? t("web.dynamic.pullRequestPresentation.open-profile") : ""}
      </TooltipPopup>
    </Tooltip>
  );
}

export function PullRequestDiffStat({
  additions,
  deletions,
  className,
}: {
  additions: number;
  deletions: number;
  className?: string;
}) {
  if (additions === 0 && deletions === 0) {
    return null;
  }
  return (
    <span className={cn("inline-flex items-baseline gap-1 tabular-nums", className)}>
      <span className="text-diff-addition-foreground">+{formatDiffCount(additions)}</span>
      <span className="text-diff-deletion">-{formatDiffCount(deletions)}</span>
    </span>
  );
}

function separatorKey(segment: ReactNode): string {
  return `separator:${isValidElement(segment) ? String(segment.key) : String(segment)}`;
}

export function PullRequestMetaLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const segments = Children.toArray(children);
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {segments.flatMap((segment, index) =>
        index === 0
          ? segment
          : [
              <span
                aria-hidden
                className="shrink-0 text-muted-foreground/50"
                key={separatorKey(segment)}
              >
                ·
              </span>,
              segment,
            ],
      )}
    </span>
  );
}

export function summarizePullRequestChecks(
  checks: ReadonlyArray<PullRequestCheck>,
  t?: TFunction,
): string {
  if (checks.length === 0) return t ? t("pr.status.noChecks") : "No checks reported";
  const actionRequired = checks.filter((check) => check.status === "action-required");
  const workflowApprovalRequired = actionRequired.filter(isWorkflowApprovalCheck).length;
  const otherActionRequired = actionRequired.length - workflowApprovalRequired;
  const failed = checks.filter(
    (check) => check.status === "failure" || check.status === "cancelled",
  ).length;
  const pending = checks.filter((check) => check.status === "pending").length;
  const passed = checks.filter((check) => check.status === "success").length;
  if (t) {
    const total = checks.length;
    if (failed > 0) return t("web.pr.checks.failedCount", { count: failed, total });
    if (workflowApprovalRequired > 0 && otherActionRequired > 0)
      return t("web.pr.checks.mixedActions", {
        workflows: workflowApprovalRequired,
        checks: otherActionRequired,
      });
    if (workflowApprovalRequired > 0)
      return t("web.pr.checks.workflowApproval", { count: workflowApprovalRequired });
    if (otherActionRequired > 0) return t("web.pr.checks.action", { count: otherActionRequired });
    if (pending > 0) return t("web.pr.checks.runningCount", { count: pending, total });
    return passed === total
      ? t("pr.status.allPassed")
      : t("web.pr.checks.passedCount", { count: passed, total });
  }
  if (failed > 0) return `${failed} of ${checks.length} failing`;
  if (workflowApprovalRequired > 0 && otherActionRequired > 0) {
    return `${workflowApprovalRequired} ${workflowApprovalRequired === 1 ? "workflow" : "workflows"} and ${otherActionRequired} ${otherActionRequired === 1 ? "check" : "checks"} awaiting action`;
  }
  if (workflowApprovalRequired > 0) {
    return `${workflowApprovalRequired} ${workflowApprovalRequired === 1 ? "workflow" : "workflows"} awaiting approval`;
  }
  if (otherActionRequired > 0) {
    return `${otherActionRequired} ${otherActionRequired === 1 ? "check" : "checks"} awaiting action`;
  }
  if (pending > 0) return `${pending} of ${checks.length} running`;
  return passed === checks.length ? "All checks passed" : `${passed} of ${checks.length} passing`;
}
