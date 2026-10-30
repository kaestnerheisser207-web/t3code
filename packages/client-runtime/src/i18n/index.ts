import { createInstance, type Module } from "i18next";

import { en } from "./locales/en.ts";
import { zhCN } from "./locales/zh-CN.ts";
import type { InterfaceLanguage } from "./language.ts";

export { isLanguagePreference, resolveLanguage, type InterfaceLanguage } from "./language.ts";
export type TranslationKey = keyof typeof en;

export const resources = {
  en: { translation: en },
  "zh-CN": { translation: zhCN },
} as const;

declare module "i18next" {
  interface CustomTypeOptions {
    resources: typeof resources.en;
    defaultNS: "translation";
    keySeparator: false;
    enableSelector: false;
    strictKeyChecks: true;
    returnNull: false;
  }
}

export function createI18n(language: InterfaceLanguage = "en", plugins: readonly Module[] = []) {
  const instance = createInstance();
  for (const plugin of plugins) instance.use(plugin);
  void instance.init({
    resources,
    lng: language,
    supportedLngs: ["en", "zh-CN"],
    fallbackLng: "en",
    keySeparator: false,
    initAsync: false,
    returnNull: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

export { runtimeModeText } from "./runtimeMode.ts";
export { sourceControlTerm } from "./sourceControlTerm.ts";

export { idleCompactionTitle, idleCompactingLabel } from "./compaction.ts";
export { usageAccessibilityLabel } from "./usage.ts";

export { sessionPermissionsText } from "./permissions.ts";
