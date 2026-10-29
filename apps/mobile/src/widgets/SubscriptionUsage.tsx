import { HStack, ProgressView, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityLabel,
  containerBackground,
  environment,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  progressViewStyle,
  tint,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import type { SubscriptionUsageSnapshot as SubscriptionUsageProps } from "./subscriptionUsageSnapshot";

type UsageConfiguration = {
  codexPeriod?: "auto" | "session" | "weekly";
  claudePeriod?: "auto" | "session" | "weekly";
};

function SubscriptionUsage(
  props: SubscriptionUsageProps,
  widgetEnvironment: WidgetEnvironment<UsageConfiguration> & {
    showsContainerBackground?: boolean;
  },
) {
  "widget";

  const chinese = (widgetEnvironment.locale ?? props.language) === "zh-CN";
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

  // The extension evaluates this function without the app's module scope.
  const family = widgetEnvironment.widgetFamily;
  // Gallery snapshots can render an old timeline entry after it has expired.
  const now = Math.max(widgetEnvironment.date?.getTime() ?? 0, Date.now());
  const accessory = family === "accessoryRectangular";
  const compact =
    family === "systemSmall" || accessory || widgetEnvironment.levelOfDetail === "simplified";
  const dense = family === "systemSmall" || family === "systemMedium";
  const limit = family === "systemExtraLarge" ? 6 : family === "systemLarge" ? 4 : 2;
  const monochrome =
    widgetEnvironment.widgetRenderingMode !== "fullColor" || widgetEnvironment.isLuminanceReduced;
  const mode = props.theme?.mode;
  const appearance =
    mode === "light" || mode === "dark"
      ? mode
      : widgetEnvironment.colorScheme === "dark"
        ? "dark"
        : "light";
  // StandBy can remove the card even in full color; text must then follow the host.
  const palette =
    !accessory && !monochrome && widgetEnvironment.showsContainerBackground !== false
      ? props.theme?.[appearance]
      : undefined;
  const primary = palette?.foreground ?? "primary";
  const secondary = palette?.secondary ?? "secondary";
  const providers = props.providers ?? [
    { name: "Codex", detail: "Open T3 to connect", windows: [], expiresAt: 0 },
    { name: "Claude", detail: "Open T3 to connect", windows: [], expiresAt: 0 },
  ];
  const columns = providers.map((provider) => {
    const stale = provider.windows.length > 0 && now >= provider.expiresAt;
    const period =
      widgetEnvironment.configuration?.[
        provider.name === "Claude" ? "claudePeriod" : "codexPeriod"
      ] ?? "auto";
    const windows = stale
      ? []
      : provider.windows.filter((window) => period === "auto" || window.kind === period);
    const tightest = windows.reduce<(typeof windows)[number] | undefined>(
      (result, window) => (!result || window.remaining < result.remaining ? window : result),
      undefined,
    );
    const compactWindows = [
      windows.find((window) => window.kind === "session"),
      windows.find((window) => window.kind === "weekly"),
    ].filter((window) => window !== undefined);
    const shown =
      accessory || widgetEnvironment.levelOfDetail === "simplified"
        ? tightest
          ? [tightest]
          : []
        : family === "systemSmall" && compactWindows.length > 0
          ? compactWindows
          : period === "auto" && compactWindows.length > 0
            ? [
                ...compactWindows,
                ...windows.filter((window) => !compactWindows.includes(window)),
              ].slice(0, limit)
            : windows.slice(0, limit);
    const detail = stale
      ? detailText("Open T3 to refresh")
      : period !== "auto" && windows.length === 0 && provider.windows.length > 0
        ? chinese
          ? `未报告${period === "session" ? "会话" : "每周"}配额上限`
          : `No ${period} limit reported`
        : detailText(
            provider.detail,
            "accountCount" in provider ? provider.accountCount : undefined,
          );
    const barModifiers = [
      progressViewStyle("linear"),
      frame({ height: 4 }),
      ...(monochrome ? [] : [tint(provider.name === "Claude" ? "#d97757" : "#8e8e93")]),
    ];
    if (accessory) {
      return (
        <VStack
          key={provider.name}
          alignment="leading"
          spacing={2}
          modifiers={[
            accessibilityElement("ignore"),
            accessibilityLabel(
              tightest
                ? `${provider.name}, ${windowLabel(tightest.label)}, ${tightest.remaining}${chinese ? "% 剩余。" : " percent remaining."} ${resetText(tightest)}. ${detail}.`
                : `${provider.name}. ${detail}.`,
            ),
          ]}
        >
          <HStack spacing={4}>
            <Text
              modifiers={[
                font({ textStyle: "caption", weight: "semibold" }),
                lineLimit(1),
                foregroundStyle(primary),
              ]}
            >
              {provider.name}
              {tightest ? ` · ${windowLabel(tightest.label)}` : ""}
            </Text>
            <Spacer />
            <Text
              modifiers={[
                font({ textStyle: "caption", weight: "semibold" }),
                lineLimit(1),
                layoutPriority(1),
                foregroundStyle(primary),
              ]}
            >
              {tightest
                ? chinese
                  ? `剩余 ${tightest.remaining}%`
                  : `${tightest.remaining}% left`
                : period !== "auto" && !stale && provider.windows.length > 0
                  ? "N/A"
                  : chinese
                    ? "打开 T3"
                    : "Open T3"}
            </Text>
          </HStack>
          {tightest ? (
            <ProgressView value={tightest.remaining / 100} modifiers={barModifiers} />
          ) : null}
        </VStack>
      );
    }
    return (
      <VStack
        key={provider.name}
        alignment="leading"
        spacing={dense ? 1 : compact ? 2 : 4}
        modifiers={[
          frame({ maxWidth: Infinity, alignment: "leading" }),
          fixedSize({ horizontal: false, vertical: true }),
        ]}
      >
        <Text
          modifiers={[
            font({ textStyle: compact ? "caption" : "headline", weight: "bold" }),
            lineLimit(1),
            foregroundStyle(primary),
          ]}
        >
          {provider.name}
        </Text>
        {!compact || shown.length === 0 ? (
          <Text
            modifiers={[font({ textStyle: "caption2" }), foregroundStyle(secondary), lineLimit(1)]}
          >
            {!stale &&
            !(period !== "auto" && windows.length === 0 && provider.windows.length > 0) &&
            provider.detail === "Subscription remaining"
              ? " "
              : detail}
          </Text>
        ) : null}
        {shown.map((window) => (
          <VStack
            key={windowLabel(window.label)}
            alignment="leading"
            spacing={dense ? 1 : 2}
            modifiers={[
              accessibilityElement("ignore"),
              accessibilityLabel(
                `${provider.name}, ${windowLabel(window.label)}, ${window.remaining}${chinese ? "% 剩余。" : " percent remaining."} ${resetText(window)}. ${detail}.`,
              ),
            ]}
          >
            <HStack spacing={4}>
              <Text
                modifiers={[
                  font({ textStyle: compact || dense ? "caption2" : "caption" }),
                  foregroundStyle(secondary),
                  lineLimit(1),
                ]}
              >
                {windowLabel(window.label)}
              </Text>
              <Spacer />
              <Text
                modifiers={[
                  font({
                    textStyle: compact || dense ? "caption2" : "caption",
                    weight: "semibold",
                  }),
                  lineLimit(1),
                  layoutPriority(1),
                  foregroundStyle(
                    window.remaining <= 10 && !monochrome
                      ? (palette?.danger ??
                          (widgetEnvironment.colorScheme === "light" ? "#dc2626" : "#fca5a5"))
                      : primary,
                  ),
                ]}
              >
                {chinese ? `剩余 ${window.remaining}%` : `${window.remaining}% left`}
              </Text>
            </HStack>
            <ProgressView value={window.remaining / 100} modifiers={barModifiers} />
            {!compact ? (
              <Text modifiers={[font({ size: 10 }), foregroundStyle(secondary), lineLimit(1)]}>
                {resetText(window)}
              </Text>
            ) : null}
          </VStack>
        ))}
        {!compact &&
        !stale &&
        (period === "auto" ? (provider.totalWindows ?? windows.length) : windows.length) > limit ? (
          <Text
            modifiers={[font({ textStyle: "caption2" }), foregroundStyle(secondary), lineLimit(1)]}
          >
            {(period === "auto" ? (provider.totalWindows ?? windows.length) : windows.length) -
              limit}{" "}
            more in T3
          </Text>
        ) : null}
      </VStack>
    );
  });
  return (
    <VStack
      alignment="leading"
      spacing={accessory || dense ? 2 : 6}
      modifiers={[
        ...(props.url ? [widgetURL(props.url)] : []),
        ...(palette
          ? [
              containerBackground(palette.background, "widget"),
              environment("colorScheme", appearance),
            ]
          : []),
      ]}
    >
      {providers.length === 0 ? (
        <Text modifiers={[font({ textStyle: "caption" }), foregroundStyle(secondary)]}>
          No subscription limits available.
        </Text>
      ) : compact ? (
        <VStack alignment="leading" spacing={accessory || dense ? 4 : 8}>
          {columns}
        </VStack>
      ) : (
        <HStack alignment="top" spacing={16}>
          {columns}
        </HStack>
      )}
      {!accessory ? <Spacer /> : null}
      {!accessory ? (
        <Text
          modifiers={[font({ textStyle: "caption2" }), foregroundStyle(secondary), lineLimit(1)]}
        >
          {props.checkedAt
            ? `${chinese ? "截至" : "As of"} ${new Date(props.checkedAt).toLocaleString(locale, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric", hour12: new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12 })}`
            : detailText("Tap to connect in T3")}
        </Text>
      ) : null}
    </VStack>
  );
}

export default createWidget("SubscriptionUsage", SubscriptionUsage);
