import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import { MenuGroupLabel } from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function PullRequestStackHeader({
  number,
  notice,
  stale = false,
}: {
  number: number;
  notice?: string | null | undefined;
  stale?: boolean;
}) {
  const t = useTranslate();
  return (
    <MenuGroupLabel>
      <div className="flex items-center justify-between gap-2">
        <span>
          <Trans
            t={t}
            i18nKey="web.rich.PullRequestStackHeader.stack-part"
            components={{ value0: <>{number}</> }}
          />
        </span>
        {notice ? (
          <Tooltip>
            <TooltipTrigger render={<span role="status" className="text-xs font-normal" />}>
              {stale
                ? t("web.dynamic.PullRequestStackHeader.may-be-stale")
                : t("web.dynamic.PullRequestStackHeader.refreshing")}
            </TooltipTrigger>
            <TooltipPopup>{notice}</TooltipPopup>
          </Tooltip>
        ) : null}
      </div>
    </MenuGroupLabel>
  );
}
