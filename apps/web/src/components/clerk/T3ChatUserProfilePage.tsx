import type { TFunction } from "i18next";
import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import { T3CHAT_PLAN_TUNNEL_LIMITS, type RelayT3ChatLink } from "@t3tools/contracts/relay";
import { MessageSquareIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useManagedTunnelUsage } from "../../cloud/managedRelayState";
import { T3CHAT_SUBSCRIPTION_URL, TunnelUsageMeter } from "../cloud/TunnelUsage";
import { Button } from "../ui/button";
import {
  ClerkUserProfilePage,
  ClerkUserProfileRefreshButton,
  ClerkUserProfileRow,
} from "./ClerkUserProfilePage";
import { useT3ChatLink } from "./useT3ChatLink";

const upgradeLink = (t: TFunction) => (
  <a className="underline" href={T3CHAT_SUBSCRIPTION_URL} target="_blank" rel="noopener noreferrer">
    {t("ui.finish.upgrade")}
  </a>
);

function planLabel(link: RelayT3ChatLink, t: TFunction): ReactNode {
  switch (link.plan) {
    case "premier":
      return t("ui.finish.premier", { count: T3CHAT_PLAN_TUNNEL_LIMITS.premier });
    case "pro":
      return (
        <Trans
          t={t}
          i18nKey="ui.finish.pro"
          values={{
            pro: T3CHAT_PLAN_TUNNEL_LIMITS.pro,
            premier: T3CHAT_PLAN_TUNNEL_LIMITS.premier,
          }}
          components={{ upgrade: upgradeLink(t) }}
        />
      );
    case "free":
      return <Trans t={t} i18nKey="ui.finish.free" components={{ upgrade: upgradeLink(t) }} />;
  }
}

/** Links a T3 Chat account so paid subscribers get more tunnels. */
export function T3ChatUserProfilePage() {
  const t = useTranslate();
  const { linkState, pending, linkUrl, link: handleLink, unlink: handleUnlink } = useT3ChatLink();
  const usage = useManagedTunnelUsage();

  const data = linkState.data;
  const link = data?.link ?? null;

  return (
    <ClerkUserProfilePage
      title={t("web.ui.T3ChatUserProfilePage.t3-chat")}
      description={t(
        "web.dynamic.T3ChatUserProfilePage.link-a-paid-t3-chat-account-for-more-t3-connect-tunnels-up-to-param-with-pro-param-with-premier",
        { pro: T3CHAT_PLAN_TUNNEL_LIMITS.pro, premier: T3CHAT_PLAN_TUNNEL_LIMITS.premier },
      )}
      action={
        <ClerkUserProfileRefreshButton
          disabled={pending !== null}
          isPending={linkState.isPending}
          onClick={usage.refresh}
        />
      }
    >
      {linkState.error ? (
        <div className="border-t py-3 text-xs" role="alert">
          <p className="font-medium text-destructive-foreground">
            {t("web.ui.T3ChatUserProfilePage.could-not-load-t3-chat-link")}
          </p>
          <p className="mt-0.5 text-muted-foreground">{linkState.error}</p>
        </div>
      ) : data === null ? null : !data.available ? (
        <p className="border-t py-4 text-xs text-muted-foreground">
          {t(
            "web.ui.T3ChatUserProfilePage.this-t3-connect-server-does-not-support-t3-chat-linking",
          )}
        </p>
      ) : (
        <ul className="border-t">
          <ClerkUserProfileRow icon={<MessageSquareIcon className="size-4" />}>
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm leading-4.5 font-medium text-foreground">
                  {link ? link.email : t("web.dynamic.T3ChatUserProfilePage.not-linked")}
                </h3>
                <p className="mt-1 text-xs leading-4.5 text-muted-foreground">
                  {link ? (
                    planLabel(link, t)
                  ) : linkUrl ? (
                    <>
                      <Trans
                        t={t}
                        i18nKey="web.rich.T3ChatUserProfilePage.confirm-on-part-t3-chat-part-then-select-refresh"
                        components={{
                          part0: (
                            <a
                              className="underline"
                              href={linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {null}
                            </a>
                          ),
                        }}
                      />
                    </>
                  ) : (
                    t("web.dynamic.T3ChatUserProfilePage.you-confirm-the-link-on-t3-chat")
                  )}
                </p>
              </div>
              {link ? (
                <Button
                  size="sm"
                  variant="destructive-outline"
                  disabled={pending !== null}
                  onClick={() => void handleUnlink()}
                >
                  {pending === "unlink"
                    ? t("web.dynamic.T3ChatUserProfilePage.unlinking")
                    : t("web.dynamic.T3ChatUserProfilePage.unlink")}
                </Button>
              ) : (
                <Button size="sm" disabled={pending !== null} onClick={() => void handleLink()}>
                  {pending === "link"
                    ? t("web.dynamic.T3ChatUserProfilePage.opening")
                    : t("web.dynamic.T3ChatUserProfilePage.link-t3-chat")}
                </Button>
              )}
            </div>
          </ClerkUserProfileRow>
          {usage.used !== null && usage.limit !== null ? (
            <li className="border-t py-4">
              <TunnelUsageMeter used={usage.used} limit={usage.limit} />
            </li>
          ) : null}
        </ul>
      )}
    </ClerkUserProfilePage>
  );
}
