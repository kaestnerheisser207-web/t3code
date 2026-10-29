import { useNavigation, useRoute } from "@react-navigation/native";
import { useLayoutEffect } from "react";

import { useTranslate } from "../../i18n";
import { SETTINGS_ROUTE_KEYS } from "./settingsLabels";

export function useSettingsPageTitle(fallback: string) {
  const t = useTranslate();
  const navigation = useNavigation();
  const route = useRoute();
  const key = SETTINGS_ROUTE_KEYS[route.name];
  const title = key ? t(key) : fallback;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- synchronize native navigation headers with the displayed settings page title
  useLayoutEffect(() => navigation.setOptions({ title }), [navigation, title]);
  return title;
}
