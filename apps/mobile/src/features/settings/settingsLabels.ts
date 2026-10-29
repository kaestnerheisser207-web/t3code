import type { TranslationKey } from "@t3tools/client-runtime/i18n";
import type { TFunction } from "i18next";

import type { SettingsSearchRow, SettingsSearchSection } from "./settings-search";

export const SETTINGS_ROUTE_KEYS: Readonly<Record<string, TranslationKey>> = {
  Settings: "settings.title",
  account: "mobile.settings.account",
  SettingsEnvironments: "settings.environments",
  SettingsNotifications: "mobile.settings.notifications",
  SettingsAppearance: "settings.appearance",
  SettingsNavigation: "mobile.settings.navigationTabs",
  SettingsKeyboard: "mobile.settings.keyboard",
  SettingsMicrophone: "mobile.settings.microphone",
  SettingsOrganization: "settings.general",
  SettingsThreads: "settings.threads",
  SettingsFollowUp: "settings.chat",
  SettingsScheduledTasks: "settings.scheduledTasks",
  SettingsProjectOverview: "settings.projects",
  SettingsProviderAccounts: "settings.providers",
  SettingsEnvironmentSourceControl: "settings.sourceControl",
  SettingsWorktrees: "settings.worktrees",
  SettingsEnvironmentMaintenance: "settings.maintenance",
  SettingsLabs: "settings.labs",
  SettingsAbout: "settings.about",
  SettingsArchive: "settings.archived",
  SettingsProjectGrouping: "mobile.settings.projectGrouping",
  SettingsClientStorage: "mobile.settings.clientStorage",
  SettingsDiagnostics: "settings.diagnostics",
  SettingsOpenSourceLicenses: "settings.openSourceLicenses",
  SettingsUsage: "mobile.settings.usage",
};

const GROUP_KEYS: Readonly<Record<string, TranslationKey>> = {
  Agents: "settings.groups.agents",
  Code: "settings.groups.code",
  Connections: "settings.groups.connections",
};

export function localizeSettingsSections<Row extends SettingsSearchRow>(
  sections: readonly SettingsSearchSection<Row>[],
  t: TFunction,
) {
  return sections.map((section) => {
    const key = section.title ? GROUP_KEYS[section.title] : undefined;
    return {
      ...section,
      ...(key ? { title: t(key) } : {}),
      rows: section.rows.map((row) => {
        const labelKey = SETTINGS_ROUTE_KEYS[row.id];
        return {
          ...row,
          label: labelKey ? t(labelKey) : row.label,
          searchTerms: [...(row.searchTerms ?? []), row.label, section.title ?? ""],
        };
      }),
    };
  });
}
