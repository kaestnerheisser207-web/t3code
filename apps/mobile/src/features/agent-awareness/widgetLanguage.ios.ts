import { requireOptionalNativeModule } from "expo";
import type { InterfaceLanguage } from "@t3tools/client-runtime/i18n";
const native = requireOptionalNativeModule<{ setLocaleOverride?(locale: string | null): void }>(
  "ExpoWidgets",
);
export function setWidgetLanguage(language: InterfaceLanguage): void {
  native?.setLocaleOverride?.(language);
}
