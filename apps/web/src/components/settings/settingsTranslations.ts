import type { TFunction } from "i18next";

import { SETTINGS_SECTION_KEYS, type SettingsSearchItem } from "./settingsSearch";

export function localizeSettingsSearchItems(items: readonly SettingsSearchItem[], t: TFunction) {
  return items.map((item) => ({
    ...item,
    title: item.titleKey ? t(item.titleKey) : item.title,
    searchTerms: [...(item.searchTerms ?? []), item.title, t(SETTINGS_SECTION_KEYS[item.to])],
  }));
}
