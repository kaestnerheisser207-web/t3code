import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId } from "@t3tools/contracts";
import { CHATGPT_USAGE_URL, collectExternalUsageLinks } from "@t3tools/shared/usageLimits";
import { Linking, Pressable, View } from "react-native";
import { AppText as Text } from "../../components/ui/AppText";
import { ProviderIcon } from "../../components/ProviderIcon";
import { environmentPresentations } from "../../state/presentation";

export function ChatGptUsageSummary({
  selectedEnvironmentIds,
}: {
  selectedEnvironmentIds: ReadonlySet<EnvironmentId> | null;
}) {
  const t = useTranslate();
  const presentations = useAtomValue(environmentPresentations.presentationsWithProvidersAtom);
  const selected =
    selectedEnvironmentIds === null
      ? presentations
      : new Map([...presentations].filter(([id]) => selectedEnvironmentIds.has(id)));
  const usage = collectExternalUsageLinks(selected).find((link) => link.url === CHATGPT_USAGE_URL);
  if (!usage) return null;
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <ProviderIcon provider="codex" size={16} />
          <Text className="text-sm text-foreground">
            {t("mobile.review.ChatGptUsageSummary.chatgpt-shared-usage")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          className="min-h-11 justify-center"
          onPress={() => void Linking.openURL(usage.url).catch(() => undefined)}
        >
          <Text className="text-sm font-t3-medium text-primary">
            {t("mobile.review.ChatGptUsageSummary.manage-usage")}
          </Text>
        </Pressable>
      </View>
      <Text className="text-xs text-foreground-muted">
        <Trans
          t={t}
          i18nKey="mobile.rich.ChatGptUsageSummary.part-open-chatgpt-with-the-account-you-connected"
          components={{ value0: <>{usage.accounts.join(", ")}</> }}
        />
      </Text>
    </View>
  );
}
