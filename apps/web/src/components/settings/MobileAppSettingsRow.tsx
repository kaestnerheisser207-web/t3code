import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import { AndroidIcon, AppleIcon } from "../Icons";
import { Button } from "../ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "../ui/popover";
import { QRCodeSvg } from "../ui/qr-code";
import { SettingsRow } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

const stores = [
  {
    label: "iPhone and iPad",
    store: "App Store",
    url: "https://apps.apple.com/us/app/t3-code-remote-claude-more/id6787819824",
    Icon: AppleIcon,
  },
  {
    label: "Android",
    store: "Google Play",
    url: "https://play.google.com/store/apps/details?id=com.t3tools.t3code",
    Icon: AndroidIcon,
  },
];

export function MobileAppSettingsRow() {
  const t = useTranslate();
  return (
    <SettingsRow
      {...searchableSetting("mobile-app")}
      description={t(
        "settings.pages.MobileAppSettingsRow.connect-to-your-server-from-your-phone-or-tablet",
      )}
      control={
        <div className="flex items-center gap-2">
          {stores.map(({ label, store, url, Icon }) => (
            <Popover key={store}>
              <PopoverTrigger render={<Button size="sm" variant="outline" />}>
                <Icon />
                {label}
              </PopoverTrigger>
              <PopoverPopup align="end">
                <div className="flex flex-col items-center gap-3">
                  <PopoverTitle>{store}</PopoverTitle>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.pages.MobileAppSettingsRow.scan-with-your-phone-camera")}
                  </p>
                  <div className="rounded-lg bg-white p-1.5">
                    <QRCodeSvg
                      value={url}
                      size={128}
                      level="M"
                      marginSize={1}
                      title={t("web.dynamic.MobileAppSettingsRow.param-link", { store: store })}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    render={<a href={url} target="_blank" rel="noreferrer noopener" />}
                  >
                    <Trans
                      t={t}
                      i18nKey="web.rich.MobileAppSettingsRow.open-part"
                      components={{ value0: <>{store}</> }}
                    />
                  </Button>
                </div>
              </PopoverPopup>
            </Popover>
          ))}
        </div>
      }
    />
  );
}
