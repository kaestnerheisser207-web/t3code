import { useTranslate } from "../../i18n";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useAdaptiveWorkspaceLayout } from "../layout/adaptive-workspace-context";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  moveNavigationTab,
  navigationCustomizationAvailable,
  toggleNavigationTabVisibility,
} from "../workspace/navigation-tab-order";
import { AppText as Text } from "../../components/ui/AppText";
import { IconButton } from "../../components/ui/IconButton";
import { Button } from "../../components/ui/Button";
import { ScreenScrollView } from "../../components/ui/ScreenScrollView";
import { SymbolView } from "../../components/ui/AppSymbol";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import {
  NAVIGATION_TAB_ICONS,
  workspaceTabLabel,
  useNavigationTabOrder,
  useHiddenNavigationTabs,
  useEnabledNavigationTabs,
} from "../workspace/navigation-tabs";
import { SettingsScreen } from "./components/SettingsScreen";
import { SettingsSection } from "./components/SettingsSection";
import { resolveWorkspaceTabOrder } from "../workspace/workspace-tabs-state";

export function SettingsNavigationRouteScreen() {
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const order = useNavigationTabOrder();
  const { layout } = useAdaptiveWorkspaceLayout();
  const capacity = Platform.OS === "android" && layout.usesSplitView ? 5 : 4;
  const hidden = useHiddenNavigationTabs();
  const enabled = useEnabledNavigationTabs();
  const preferences = useAtomValue(mobilePreferencesAtom);
  const customizable = navigationCustomizationAvailable();
  const ready = customizable && AsyncResult.isSuccess(preferences) && !preferences.waiting;
  const save = useAtomSet(updateMobilePreferencesAtom);
  return (
    <SettingsScreen title={t("mobile.settings.SettingsNavigationRouteScreen.navigation-tabs")}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <Text className="px-2 text-sm text-foreground-muted">
          {customizable
            ? t(
                "mobile.dynamic.SettingsNavigationRouteScreen.phones-show-the-first-four-enabled-sections-android-tablet-rails-show-all-enabled-sections-remaining-sections-appear-at-the-top-of-settings-hidden-sections-appear-only-here-settings-always-stays-last-saved-on-this-device",
              )
            : t(
                "mobile.dynamic.SettingsNavigationRouteScreen.tab-customization-becomes-available-when-there-are-six-sections-including-settings",
              )}
        </Text>
        <SettingsSection title={t("mobile.settings.SettingsNavigationRouteScreen.tab-order")}>
          {order.map((tab, index) => (
            <View key={tab} className="flex-row items-center gap-3 px-4 py-3">
              <SymbolView
                name={NAVIGATION_TAB_ICONS[tab]}
                size={22}
                tintColorClassName="accent-icon"
              />
              <View className="flex-1">
                <Text>{workspaceTabLabel(tab, t)}</Text>
                <Text className="text-xs text-foreground-muted">
                  {hidden.includes(tab)
                    ? t("mobile.dynamic.SettingsNavigationRouteScreen.hidden")
                    : enabled.indexOf(tab) < capacity
                      ? t("mobile.dynamic.SettingsNavigationRouteScreen.tab-param", {
                          value: enabled.indexOf(tab) + 1,
                        })
                      : t("mobile.dynamic.SettingsNavigationRouteScreen.in-settings")}
                </Text>
              </View>
              <IconButton
                icon={hidden.includes(tab) ? "eye.slash" : "eye"}
                accessibilityLabel={t(
                  hidden.includes(tab) ? "navigation.show" : "navigation.hide",
                  { tab: workspaceTabLabel(tab, t) },
                )}
                disabled={!ready}
                onPress={() =>
                  save({
                    transform: (current) => ({
                      hiddenNavigationTabs: toggleNavigationTabVisibility(
                        current.hiddenNavigationTabs,
                        tab,
                      ),
                    }),
                  })
                }
              />
              <IconButton
                icon="arrow.up"
                accessibilityLabel={t(
                  "mobile.dynamic.SettingsNavigationRouteScreen.move-param-up",
                  { value: workspaceTabLabel(tab, t) },
                )}
                disabled={!ready || index === 0}
                onPress={() =>
                  save({
                    transform: (current) => ({
                      navigationTabOrder: moveNavigationTab(
                        resolveWorkspaceTabOrder(current.navigationTabOrder),
                        tab,
                        index - 1,
                      ),
                    }),
                  })
                }
              />
              <IconButton
                icon="arrow.down"
                accessibilityLabel={t(
                  "mobile.dynamic.SettingsNavigationRouteScreen.move-param-down",
                  { value: workspaceTabLabel(tab, t) },
                )}
                disabled={!ready || index === order.length - 1}
                onPress={() =>
                  save({
                    transform: (current) => ({
                      navigationTabOrder: moveNavigationTab(
                        resolveWorkspaceTabOrder(current.navigationTabOrder),
                        tab,
                        index + 1,
                      ),
                    }),
                  })
                }
              />
            </View>
          ))}
        </SettingsSection>
        <Button
          label={t("mobile.settings.SettingsNavigationRouteScreen.reset-tabs")}
          tone="text"
          disabled={!ready}
          onPress={() => save({ navigationTabOrder: [], hiddenNavigationTabs: [] })}
        />
      </ScreenScrollView>
    </SettingsScreen>
  );
}
