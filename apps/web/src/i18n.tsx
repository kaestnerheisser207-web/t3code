import { createI18n } from "@t3tools/client-runtime/i18n";
import type { i18n } from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next";

export const webI18n: i18n = createI18n("en", [initReactI18next]);

export function LanguageProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={webI18n}>{children}</I18nextProvider>;
}

export function useTranslate() {
  return useTranslation().t;
}
