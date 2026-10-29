import { resolveLanguage } from "@t3tools/client-runtime/i18n";
import { safeErrorLogAttributes } from "@t3tools/client-runtime/errors";
import { useEffect } from "react";
import {
  refreshBrowserLanguagePreference,
  useClientSettings,
  useClientSettingsHydrated,
} from "./hooks/useSettings";
import { CLIENT_SETTINGS_STORAGE_KEY } from "./clientPersistenceStorage";
import { isElectron } from "./env";
import { webI18n } from "./i18n";

export function LanguageSync() {
  const preference = useClientSettings((settings) => settings.languagePreference);
  const hydrated = useClientSettingsHydrated();

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- observe this origin's language preference when another browser tab saves it
  useEffect(() => {
    if (isElectron) return;
    const refresh = () => {
      void refreshBrowserLanguagePreference().catch((error: unknown) =>
        console.error(
          "Could not refresh the browser language preference.",
          safeErrorLogAttributes(error),
        ),
      );
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CLIENT_SETTINGS_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    refresh();
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- synchronize the external translation instance and document with persisted device preferences
  useEffect(() => {
    if (!hydrated) return;
    const synchronize = () => {
      const desktopLocale = window.desktopBridge?.getSystemLocale();
      const languages = desktopLocale ? [desktopLocale] : navigator.languages;
      const language = resolveLanguage(preference, languages);
      void webI18n.changeLanguage(language);
      document.documentElement.lang = language;
    };
    synchronize();
    window.addEventListener("languagechange", synchronize);
    return () => window.removeEventListener("languagechange", synchronize);
  }, [preference, hydrated]);

  return null;
}
