import type { LanguagePreference } from "@t3tools/contracts/settings";

export type InterfaceLanguage = Exclude<LanguagePreference, "system">;

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === "en" || value === "zh-CN" || value === "system";
}

export function resolveLanguage(
  preference: LanguagePreference,
  systemLanguages: readonly string[],
): InterfaceLanguage {
  if (preference !== "system") return preference;
  for (const value of systemLanguages) {
    try {
      const locale = new Intl.Locale(value.replaceAll("_", "-"));
      if (locale.language === "en") return "en";
      if (locale.language === "zh" && locale.maximize().script === "Hans") return "zh-CN";
    } catch {
      // Malformed host tags must not prevent later language preferences from matching.
    }
  }
  return "en";
}
