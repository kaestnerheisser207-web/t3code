import { Trans } from "react-i18next";
import { useTranslate } from "../../../i18n";
import type { PullRequestReviewGuideStop } from "@t3tools/contracts";
import { CheckIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { Badge } from "../../ui/badge";
import { stopSubline } from "@t3tools/client-runtime/review-guide-tour";

export function GuideRail({
  stops,
  position,
  seen,
  onSelect,
}: {
  stops: ReadonlyArray<PullRequestReviewGuideStop>;
  position: number;
  seen: ReadonlySet<number>;
  onSelect: (position: number) => void;
}) {
  const t = useTranslate();
  const reviewed = seen.size;
  const renderStop = (stop: PullRequestReviewGuideStop, index: number) => (
    <li key={index}>
      <RailRow
        active={position === index}
        onClick={() => onSelect(index)}
        lead={<StopBullet number={index + 1} seen={seen.has(index)} />}
        title={stop.title}
        detail={
          <>
            {stop.attention !== null ? (
              <Badge size="sm" variant="warning">
                {t("web.ui.GuideRail.look-closely")}
              </Badge>
            ) : null}
            <span>{stopSubline(stop)}</span>
          </>
        }
      />
    </li>
  );

  return (
    <nav aria-label={t("web.ui.GuideRail.review-tour")} className="flex min-h-0 flex-col gap-4">
      <p className="text-xs text-muted-foreground tabular-nums @max-[56rem]/guide:hidden">
        <Trans
          t={t}
          i18nKey="web.rich.GuideRail.part-of-part-read"
          components={{ value0: <>{reviewed}</>, value1: <>{stops.length}</> }}
        />
      </p>
      <div className="flex flex-col gap-4">
        <ol className="flex flex-col gap-0.5">{stops.map(renderStop)}</ol>
      </div>
    </nav>
  );
}

function RailRow({
  active,
  onClick,
  lead,
  title,
  detail,
}: {
  active: boolean;
  onClick: () => void;
  lead: React.ReactNode;
  title: string;
  detail: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "step" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
      )}
    >
      {lead}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-foreground">{title}</span>
        {detail !== null ? (
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function StopBullet({ number, seen }: { number: number; seen: boolean }) {
  const t = useTranslate();
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border text-2xs tabular-nums",
        seen ? "border-success/40 text-success-foreground" : "border-border text-muted-foreground",
      )}
    >
      {seen ? (
        <CheckIcon
          aria-label={t("web.dynamic.GuideRail.stop-param-read", { number: number })}
          className="size-3"
        />
      ) : (
        number
      )}
    </span>
  );
}
