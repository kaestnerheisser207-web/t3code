import { useTranslate } from "../../i18n";
import { AppText as Text } from "../../components/ui/AppText";
import { cn } from "../../lib/cn";
import { copyTextWithHaptic } from "../../lib/copyTextWithHaptic";

export function ConnectionTraceId({
  traceId,
  tone = "muted",
  activation = "press",
}: {
  readonly traceId: string;
  readonly tone?: "muted" | "danger";
  readonly activation?: "press" | "longPress";
}) {
  const t = useTranslate();
  const copy = () => copyTextWithHaptic(traceId, { target: "connection-trace-id" });
  return (
    <>
      {t("mobile.dynamic.ConnectionTraceId.trace-id")}
      <Text
        accessibilityHint={
          activation === "longPress"
            ? t("mobile.dynamic.ConnectionTraceId.long-press-to-copy-the-trace-id")
            : t("mobile.dynamic.ConnectionTraceId.copies-the-trace-id")
        }
        accessibilityLabel={t("mobile.dynamic.ConnectionTraceId.copy-trace-id-param", {
          traceId: traceId,
        })}
        accessibilityRole="button"
        accessibilityActions={[
          { name: "activate", label: t("mobile.connect.T3ConnectProfilePage.copy-trace-id") },
        ]}
        onAccessibilityAction={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.actionName === "activate") copy();
        }}
        className={cn(
          "underline decoration-dotted",
          tone === "danger" ? "text-danger-foreground" : "text-foreground-muted",
        )}
        onLongPress={
          activation === "longPress"
            ? (event) => {
                event.stopPropagation();
                copy();
              }
            : undefined
        }
        onPress={(event) => {
          event.stopPropagation();
          if (activation === "press") copy();
        }}
      >
        {traceId}
      </Text>
    </>
  );
}
