import { useTranslate } from "../../i18n";
import { InfoIcon, RotateCwIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function DiffFileStatus({
  error,
  truncated,
  retry,
}: {
  error?: boolean | undefined;
  truncated?: boolean | undefined;
  retry: () => void;
}) {
  const t = useTranslate();
  if (!error && !truncated) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-micro"
            variant="ghost-muted"
            aria-label={
              error
                ? t("web.dynamic.DiffFileStatus.retry-loading-diff")
                : t("web.dynamic.DiffFileStatus.partial-diff-preview")
            }
            onClick={(event) => {
              event.stopPropagation();
              if (error) retry();
            }}
          />
        }
      >
        {error ? <RotateCwIcon className="size-3" /> : <InfoIcon className="size-3" />}
      </TooltipTrigger>
      <TooltipPopup>
        {error
          ? t("web.dynamic.DiffFileStatus.retry-loading-diff")
          : t(
              "web.dynamic.DiffFileStatus.this-file-is-too-large-to-show-in-full-counts-include-all-changes",
            )}
      </TooltipPopup>
    </Tooltip>
  );
}
