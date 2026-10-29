import { useTranslate } from "../../i18n";
import type { PullRequestReplyAvailability } from "./pullRequestDetail.logic";

export function PullRequestMoreReplies({
  moreReplies,
  hasMoreReplies,
  url,
}: PullRequestReplyAvailability) {
  const t = useTranslate();
  if (!hasMoreReplies) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-2 py-1 text-xs text-muted-foreground">
      <span>
        {moreReplies > 0
          ? t("web.dynamic.PullRequestMoreReplies.moreReplyCount", {
              formattedCount: moreReplies.toLocaleString(),
              count: moreReplies,
            })
          : t("web.dynamic.PullRequestMoreReplies.more-replies")}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          {t("web.ui.PullRequestMoreReplies.view-on-host")}
        </a>
      ) : null}
    </div>
  );
}
