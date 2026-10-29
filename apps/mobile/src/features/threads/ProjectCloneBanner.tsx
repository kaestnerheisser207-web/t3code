import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import { Button } from "../../components/ui/Button";
import {
  projectCloneDisplayName,
  projectCloneProgressSummary,
  type ProjectCloneSnapshot,
} from "@t3tools/contracts";
import { View } from "react-native";

import { AppActivityIndicator } from "../../components/ui/AppActivityIndicator";
import { cn } from "../../lib/cn";
import { AppText as Text } from "../../components/ui/AppText";

export function ProjectCloneBanner(props: {
  readonly clone: ProjectCloneSnapshot;
  readonly onCancel: () => void;
  readonly onRetry: () => void;
  readonly onRemove: () => void;
}) {
  const t = useTranslate();
  const { clone } = props;
  const name = projectCloneDisplayName(clone);
  if (clone.phase === "running") {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3">
        <AppActivityIndicator size="small" />
        <View className="min-w-0 flex-1">
          <Text className="font-t3-medium text-sm" numberOfLines={1}>
            <Trans
              t={t}
              i18nKey="mobile.rich.ProjectCloneBanner.cloning-part"
              components={{ value0: <>{name}</> }}
            />
          </Text>
          <Text className="text-xs text-foreground-muted" numberOfLines={1}>
            {projectCloneProgressSummary(clone)}
          </Text>
        </View>
        <BannerAction
          label={t("mobile.threads.ProjectCloneBanner.cancel")}
          onPress={props.onCancel}
        />
      </View>
    );
  }
  const cancelled = clone.phase === "cancelled";
  return (
    <View
      className={cn(
        "rounded-2xl border px-3.5 py-3",
        cancelled ? "border-warning-border bg-warning" : "border-danger-border bg-danger",
      )}
    >
      <Text
        className={cn(
          "font-t3-medium text-sm",
          cancelled ? "text-warning-foreground" : "text-danger-foreground",
        )}
        numberOfLines={1}
      >
        {cancelled
          ? t("mobile.dynamic.ProjectCloneBanner.cancelled-cloning-param", { name: name })
          : t("mobile.dynamic.ProjectCloneBanner.failed-to-clone-param", { name: name })}
      </Text>
      {clone.error ? (
        <Text className="mt-0.5 text-xs text-danger-foreground" numberOfLines={3}>
          {clone.error}
        </Text>
      ) : null}
      <View className="mt-2 flex-row justify-end gap-2">
        <BannerAction
          label={t("mobile.threads.ProjectCloneBanner.remove-project")}
          onPress={props.onRemove}
        />
        <BannerAction
          label={t("mobile.threads.ProjectCloneBanner.retry")}
          onPress={props.onRetry}
        />
      </View>
    </View>
  );
}

function BannerAction(props: { readonly label: string; readonly onPress: () => void }) {
  return (
    <Button
      label={props.label}
      tone="secondary"
      accessibilityLabel={props.label}
      onPress={props.onPress}
    />
  );
}
