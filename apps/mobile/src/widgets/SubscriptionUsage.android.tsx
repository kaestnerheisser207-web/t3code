import {
  Button,
  Column,
  getMaterialColors,
  LinearProgressIndicator,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  fillMaxSize,
  fillMaxWidth,
  height,
  padding,
  paddingAll,
} from "@expo/ui/jetpack-compose/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import type { SubscriptionUsageSnapshot as SubscriptionUsageProps } from "./subscriptionUsageSnapshot";

export function SubscriptionUsage(props: SubscriptionUsageProps, environment: WidgetEnvironment) {
  "widget";

  const chinese = props.language === "zh-CN";
  const locale = chinese ? "zh-CN" : "en";
  const details: Record<string, string> = {
    "Open T3 to connect": "打开 T3 以连接",
    "Open T3 to refresh": "打开 T3 以刷新",
    "No limits available": "暂无配额信息",
    "Subscription remaining": "订阅剩余额度",
    "Tap to connect in T3": "点按以在 T3 中连接",
  };
  const detailText = (value: string, accountCount?: number) =>
    !chinese
      ? value
      : accountCount && accountCount > 1 && value.endsWith("accounts · pooled")
        ? `${accountCount} 个账户 · 汇总`
        : (details[value] ?? value);
  const windowLabel = (value: string) =>
    chinese ? (value === "Session" ? "会话配额" : value === "Weekly" ? "每周配额" : value) : value;
  const resetText = (window: { reset: string; resetAt?: number }) =>
    window.resetAt !== undefined
      ? `${chinese ? "下次重置" : "Next reset"} ${new Date(window.resetAt).toLocaleString(locale, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12,
        })}`
      : chinese && window.reset === "Reset time unavailable"
        ? "重置时间不可用"
        : window.reset;

  // The widget runtime evaluates this function without the app's module scope.
  const now = Date.now();
  const limit = 2;
  const mode = props.theme?.mode;
  const appearance =
    mode === "light" || mode === "dark"
      ? mode
      : environment.colorScheme === "dark"
        ? "dark"
        : "light";
  const palette = props.theme?.[appearance];
  const colors = palette
    ? {
        surface: palette.background,
        onSurface: palette.foreground,
        onSurfaceVariant: palette.secondary,
        surfaceVariant: palette.track,
        primary: palette.accent,
        error: palette.danger,
      }
    : getMaterialColors({ scheme: appearance });
  const muted = colors.onSurfaceVariant;
  const providers = props.providers ?? [
    { name: "Codex", detail: "Open T3 to connect", windows: [], expiresAt: 0, totalWindows: 0 },
    { name: "Claude", detail: "Open T3 to connect", windows: [], expiresAt: 0, totalWindows: 0 },
  ];
  return (
    // Android lacks widgetURL; one card Button routes taps to the app listener opening props.url.
    <Button
      colors={{ containerColor: colors.surface }}
      modifiers={[fillMaxSize()]}
      onClick={() => {}}
    >
      <Column modifiers={[fillMaxSize(), paddingAll(16)]}>
        {providers.map((provider, index) => {
          const stale =
            provider.windows.length > 0 && provider.expiresAt > 0 && now >= provider.expiresAt;
          const shown = stale ? [] : provider.windows.slice(0, limit);
          const hidden = stale ? 0 : (provider.totalWindows ?? provider.windows.length) - limit;
          return (
            <Column
              key={provider.name}
              modifiers={[fillMaxWidth(), padding(0, index === 0 ? 0 : 10, 0, 0)]}
            >
              <Text
                color={colors.onSurface}
                maxLines={1}
                style={{ fontSize: 13, fontWeight: "bold" }}
              >
                {provider.name}
              </Text>
              {shown.length === 0 ? (
                <Text color={muted} maxLines={1} style={{ fontSize: 11 }}>
                  {detailText(
                    stale ? "Open T3 to refresh" : provider.detail,
                    "accountCount" in provider ? provider.accountCount : undefined,
                  )}
                </Text>
              ) : null}
              {shown.map((window) => {
                const low = window.remaining <= 10;
                return (
                  <Column
                    key={windowLabel(window.label)}
                    modifiers={[fillMaxWidth(), padding(0, 4, 0, 0)]}
                  >
                    <Text
                      color={low ? colors.error : colors.onSurface}
                      maxLines={1}
                      style={{ fontSize: 11 }}
                    >
                      {`${windowLabel(window.label)} · ${chinese ? `剩余 ${window.remaining}%` : `${chinese ? `剩余 ${window.remaining}%` : `${window.remaining}% left`}`}`}
                    </Text>
                    <Column modifiers={[fillMaxWidth(), padding(0, 3, 0, 3)]}>
                      <LinearProgressIndicator
                        progress={window.remaining / 100}
                        color={low ? colors.error : colors.primary}
                        trackColor={colors.surfaceVariant}
                        modifiers={[fillMaxWidth(), height(6)]}
                      />
                    </Column>
                    <Text color={muted} maxLines={1} style={{ fontSize: 10 }}>
                      {resetText(window)}
                    </Text>
                  </Column>
                );
              })}
              {hidden > 0 ? (
                <Text color={muted} maxLines={1} style={{ fontSize: 10 }}>
                  {chinese ? `T3 中还有 ${hidden} 项` : `${hidden} more in T3`}
                </Text>
              ) : null}
            </Column>
          );
        })}
        <Text
          color={muted}
          maxLines={1}
          style={{ fontSize: 10 }}
          modifiers={[padding(0, 10, 0, 0)]}
        >
          {props.checkedAt
            ? `${chinese ? "截至" : "As of"} ${new Date(props.checkedAt).toLocaleString(locale, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric", hour12: new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12 })}`
            : detailText("Tap to connect in T3")}
        </Text>
      </Column>
    </Button>
  );
}

export default createWidget("SubscriptionUsage", SubscriptionUsage);
