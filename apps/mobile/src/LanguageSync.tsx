import { setWidgetLanguage } from "./features/agent-awareness/widgetLanguage";
import { setAndroidNotificationLanguage } from "./features/agent-awareness/androidNotifications";
import { useAtomValue } from "@effect/atom-react";
import { resolveLanguage } from "@t3tools/client-runtime/i18n";
import { AsyncResult } from "effect/reactivity";
import { useLocales } from "expo-localization";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { mobilePreferencesAtom } from "./state/preferences";
import { mobileI18n } from "./i18n";

function useLanguagePreference() {
  const preferences = useAtomValue(mobilePreferencesAtom);
  const locales = useLocales();
  const preference = AsyncResult.isSuccess(preferences)
    ? (preferences.value.languagePreference ?? "en")
    : "en";
  return {
    language: resolveLanguage(
      preference,
      locales.map((locale) => locale.languageTag),
    ),
    ready: AsyncResult.isSuccess(preferences),
  };
}

export function LanguageSync() {
  const { language, ready } = useLanguagePreference();
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- synchronize the external translation instance after native preferences are loaded
  useEffect(() => {
    if (ready) {
      void mobileI18n.changeLanguage(language);
      setAndroidNotificationLanguage(language);
      setWidgetLanguage(language);
    }
  }, [language, ready]);
  return null;
}

export function useLanguageReady() {
  const { language, ready } = useLanguagePreference();
  const { i18n } = useTranslation();
  return ready && i18n.resolvedLanguage === language;
}
