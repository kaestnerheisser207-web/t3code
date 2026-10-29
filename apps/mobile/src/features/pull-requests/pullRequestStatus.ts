import type { TFunction } from "i18next";
import type {
  PullRequestActivity,
  PullRequestCheck,
  PullRequestChecksState,
  PullRequestDetail,
  PullRequestListEntry,
  PullRequestMergeability,
} from "@t3tools/contracts";
import type { AppSymbolName } from "../../components/ui/AppSymbol";
import { PullRequestGlyph } from "./pullRequestGlyphs";

const STATES = {
  open: {
    label: "Open",
    icon: PullRequestGlyph.pullRequest,
    tint: "accent-adaptive-emerald-600-400",
    text: "text-adaptive-emerald-600-400",
    background: "bg-adaptive-emerald-500-a12-a16",
  },
  merged: {
    label: "Merged",
    icon: PullRequestGlyph.merged,
    tint: "accent-adaptive-violet-600-400",
    text: "text-adaptive-violet-600-400",
    background: "bg-adaptive-violet-500-a12-a16",
  },
  closed: {
    label: "Closed",
    icon: PullRequestGlyph.closed,
    tint: "accent-danger-foreground",
    text: "text-danger-foreground",
    background: "bg-danger",
  },
  draft: {
    label: "Draft",
    icon: PullRequestGlyph.draft,
    tint: "accent-icon-muted",
    text: "text-foreground-muted",
    background: "bg-grouped-card",
  },
} satisfies Record<
  string,
  { label: string; icon: AppSymbolName; tint: string; text: string; background: string }
>;

export function pullRequestStatus(
  pr: Pick<PullRequestListEntry, "state" | "isDraft">,
  t?: TFunction,
) {
  const key = pr.isDraft && pr.state === "open" ? "draft" : pr.state;
  const presentation = STATES[key];
  return t
    ? { ...presentation, label: t(key === "draft" ? "pr.status.draft" : `pr.filters.${key}`) }
    : presentation;
}

export function pullRequestConflict(
  pr: {
    readonly state: PullRequestListEntry["state"];
    readonly isDraft: boolean;
    readonly mergeability?: PullRequestMergeability | undefined;
    readonly baseBranch?: string | undefined;
  },
  t?: TFunction,
) {
  if (pr.state !== "open" || pr.isDraft || pr.mergeability !== "conflicting") return null;
  return {
    label: pr.baseBranch
      ? (t?.("pr.status.conflictsWith", { branch: pr.baseBranch }) ??
        `Conflicts with ${pr.baseBranch}`)
      : (t?.("pr.status.conflicts") ?? "Has conflicts"),
  };
}

export function checkStatus(check: PullRequestCheck, t?: TFunction) {
  switch (check.status) {
    case "success":
      return {
        label: t?.("pr.status.passed") ?? "Passed",
        icon: "checkmark.circle",
        tint: "accent-adaptive-emerald-600-400",
      } as const;
    case "failure":
      return {
        label: t?.("pr.status.failed") ?? "Failed",
        icon: "exclamationmark.circle",
        tint: "accent-danger-foreground",
      } as const;
    case "action-required":
      return {
        label: t?.("pr.status.actionRequired") ?? "Action required",
        icon: "exclamationmark.circle",
        tint: "accent-warning-foreground",
      } as const;
    case "pending":
      return {
        label: t?.("pr.status.pending") ?? "Pending",
        icon: "clock",
        tint: "accent-warning-foreground",
      } as const;
    case "cancelled":
      return {
        label: t?.("pr.status.cancelled") ?? "Cancelled",
        icon: "minus",
        tint: "accent-icon-muted",
      } as const;
    case "skipped":
      return {
        label: t?.("pr.status.skipped") ?? "Skipped",
        icon: "slash.circle",
        tint: "accent-icon-muted",
      } as const;
    case "neutral":
      return {
        label: t?.("pr.status.neutral") ?? "Neutral",
        icon: "minus",
        tint: "accent-icon-muted",
      } as const;
  }
}

export function pullRequestChecksSummary(pr: Pick<PullRequestDetail, "checks">, t?: TFunction) {
  const failed = pr.checks.filter((check) => check.status === "failure").length;
  const required = pr.checks.filter((check) => check.status === "action-required").length;
  const pending = pr.checks.filter((check) => check.status === "pending").length;
  const passed = pr.checks.filter((check) => check.status === "success").length;
  const count = pr.checks.length
    ? (t?.("pr.status.fraction", { passed, total: pr.checks.length }) ??
      `${passed} of ${pr.checks.length}`)
    : undefined;
  if (failed)
    return {
      label:
        t?.("pr.status.failing", { count: failed }) ??
        `${failed} ${failed === 1 ? "check" : "checks"} failing`,
      title:
        t?.("pr.status.failing", { count: failed }) ??
        `${failed} ${failed === 1 ? "check" : "checks"} failing`,
      count,
      icon: "exclamationmark.circle",
      tint: "accent-danger-foreground",
    } as const;
  if (required)
    return {
      label: t?.("pr.status.attention", { count: required }) ?? `${required} need attention`,
      title: t?.("pr.status.checksAttention") ?? "Checks need attention",
      count: t?.("pr.status.awaitingAction", { count: required }) ?? `${required} awaiting action`,
      icon: "exclamationmark.circle",
      tint: "accent-warning-foreground",
    } as const;
  if (pending)
    return {
      label: t?.("pr.status.pendingCount", { count: pending }) ?? `${pending} pending`,
      title: t?.("pr.status.running") ?? "Checks running",
      count: t?.("pr.status.pendingCount", { count: pending }) ?? `${pending} pending`,
      icon: "clock",
      tint: "accent-warning-foreground",
    } as const;
  if (passed)
    return {
      label:
        t?.("pr.status.passedCount", { passed, total: pr.checks.length }) ??
        `${passed} of ${pr.checks.length} passed`,
      title:
        passed === pr.checks.length
          ? (t?.("pr.status.allPassed") ?? "All checks passed")
          : (t?.("pr.status.completed") ?? "Checks completed"),
      count,
      icon: "checkmark.circle",
      tint: "accent-adaptive-emerald-600-400",
    } as const;
  return {
    label: pr.checks.length
      ? (t?.("pr.status.completedCount", { count: pr.checks.length }) ??
        `${pr.checks.length} completed`)
      : (t?.("pr.status.noChecks") ?? "No checks reported"),
    title: pr.checks.length
      ? (t?.("pr.status.completed") ?? "Checks completed")
      : (t?.("pr.status.noChecks") ?? "No checks reported"),
    count,
    icon: "minus",
    tint: "accent-icon-muted",
  } as const;
}

export function pullRequestReviewSummary(
  pr: Pick<PullRequestDetail, "reviewers">,
  activity: Pick<PullRequestActivity, "comments" | "commits"> | null,
  t?: TFunction,
) {
  const latest = new Map<string, PullRequestActivity["comments"][number]>();
  const comments = new Map<string, PullRequestActivity["comments"][number]>();
  for (const review of activity?.comments ?? []) {
    if (review.kind !== "review" || !review.reviewState) continue;
    const state = review.reviewState.toUpperCase().replaceAll("-", "_");
    const key = review.author?.login ?? review.id;
    if (state === "COMMENTED") {
      const previous = comments.get(key);
      if (!previous || Date.parse(review.createdAt) >= Date.parse(previous.createdAt))
        comments.set(key, { ...review, reviewState: state });
      continue;
    }
    if (!["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(state)) continue;
    const previous = latest.get(key);
    if (!previous || Date.parse(review.createdAt) >= Date.parse(previous.createdAt))
      latest.set(key, { ...review, reviewState: state });
  }
  const reviews = [
    ...[...latest.values()].filter((review) => review.reviewState !== "DISMISSED"),
    ...[...comments.entries()].filter(([key]) => !latest.has(key)).map(([, review]) => review),
  ];
  const requested = reviews.filter((review) => review.reviewState === "CHANGES_REQUESTED");
  const newestCommit = Math.max(
    0,
    ...(activity?.commits.map((commit) => Date.parse(commit.committedDate)) ?? []),
  );
  const approved = reviews.filter(
    (review) => review.reviewState === "APPROVED" && Date.parse(review.createdAt) >= newestCommit,
  );
  if (requested.length)
    return {
      title: t?.("pr.filters.changesRequested") ?? "Changes requested",
      count:
        t?.("pr.status.reviewers", { count: requested.length }) ??
        `${requested.length} ${requested.length === 1 ? "reviewer" : "reviewers"}`,
      icon: "xmark.circle.fill",
      tint: "accent-danger-foreground",
      reviews,
    } as const;
  if (approved.length)
    return {
      title:
        approved.length === 1 && approved[0]?.author
          ? (t?.("pr.status.approvedBy", { login: approved[0].author.login }) ??
            `Approved by ${approved[0].author.login}`)
          : (t?.("pr.status.reviewsApproved") ?? "Reviews approved"),
      count:
        t?.("pr.status.approvedCount", { count: approved.length }) ?? `${approved.length} approved`,
      icon: "checkmark.circle",
      tint: "accent-adaptive-emerald-600-400",
      reviews,
    } as const;
  const commented = reviews.filter((review) => review.reviewState === "COMMENTED");
  if (commented.length && !pr.reviewers.length)
    return {
      title: t?.("pr.filters.reviews") ?? "Reviews",
      count:
        t?.("pr.status.commentedCount", { count: commented.length }) ??
        `${commented.length} commented`,
      icon: "bubble.left",
      tint: "accent-icon-muted",
      reviews,
    } as const;
  return {
    title: pr.reviewers.length
      ? (t?.("pr.status.awaitingReview") ?? "Awaiting review")
      : (t?.("pr.status.requestReview") ?? "Request a review"),
    count: pr.reviewers.length
      ? (t?.("pr.status.requestedCount", { count: pr.reviewers.length }) ??
        `${pr.reviewers.length} requested`)
      : (t?.("pr.status.noneAssigned") ?? "None assigned"),
    icon: "person.2",
    tint: "accent-icon-muted",
    reviews,
  } as const;
}

export function pullRequestBranchSummary(
  pr: Pick<PullRequestDetail, "mergeability" | "baseComparison" | "behindBy" | "baseBranch">,
  t?: TFunction,
) {
  if (pr.mergeability === "conflicting") return t?.("pr.status.conflicts") ?? "Has conflicts";
  if (pr.baseComparison === "behind")
    return t
      ? pr.behindBy == null
        ? t("pr.status.behindUnknown", { branch: pr.baseBranch })
        : t("pr.status.behind", { count: pr.behindBy, branch: pr.baseBranch })
      : `${pr.behindBy ?? ""} behind ${pr.baseBranch}`.trim();
  if (pr.baseComparison === "up-to-date") return t?.("pr.status.upToDate") ?? "Up to date";
  return pr.mergeability === "mergeable"
    ? (t?.("pr.status.noConflicts") ?? "No conflicts")
    : (t?.("pr.status.notReported") ?? "Not reported");
}

export function pullRequestChecksStatus(state: PullRequestChecksState) {
  if (state === "passing")
    return { icon: "checkmark.circle", tint: "accent-adaptive-emerald-600-400" } as const;
  if (state === "failing")
    return { icon: "xmark.circle.fill", tint: "accent-danger-foreground" } as const;
  return { icon: "clock", tint: "accent-warning-foreground" } as const;
}
