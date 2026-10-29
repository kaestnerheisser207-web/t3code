import { useTranslate } from "../../i18n";
import type { DevicePlatformAvailability } from "@t3tools/contracts";
import { Check, Minus } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipPopup } from "../ui/tooltip";

export function DeviceHostAvailability({
  platforms,
}: {
  platforms: ReadonlyArray<DevicePlatformAvailability>;
}) {
  const t = useTranslate();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {platforms.map((platform) => (
        <Tooltip key={platform.platform}>
          <TooltipTrigger render={<span tabIndex={0} className="inline-flex items-center gap-1" />}>
            {platform.available ? <Check className="size-3" /> : <Minus className="size-3" />}
            {platform.platform === "ios" ? "iOS" : "Android"}{" "}
            {platform.available
              ? t("web.dynamic.DeviceHostAvailability.available")
              : t("web.dynamic.DeviceHostAvailability.unavailable")}
          </TooltipTrigger>
          <TooltipPopup>
            {platform.reason ??
              (platform.platform === "ios"
                ? t("web.dynamic.DeviceHostAvailability.ios-available")
                : t("web.dynamic.DeviceHostAvailability.android-available"))}
          </TooltipPopup>
        </Tooltip>
      ))}
    </div>
  );
}
