import { useTranslate } from "../../../../i18n";
import { View } from "react-native";

import { ListChoiceRow as SettingsChoiceRow } from "../../../../components/ui/ListChoiceRow";
import { SettingsSection } from "../../components/SettingsSection";
import { useAppearancePreferences } from "../AppearancePreferencesProvider";

export function AndroidNavigationAppearanceSection() {
  const t = useTranslate();
  const { isReady, androidNavigationStyle, setAndroidNavigationStyle } = useAppearancePreferences();
  return (
    <SettingsSection title={t("mobile.appearance.AndroidNavigationAppearanceSection.navigation")}>
      <View accessibilityRole="radiogroup">
        <SettingsChoiceRow
          label="One UI"
          description={t(
            "mobile.appearance.AndroidNavigationAppearanceSection.floating-navigation-with-a-separate-compose-button",
          )}
          disabled={!isReady}
          selected={androidNavigationStyle === "one-ui"}
          onPress={() => setAndroidNavigationStyle("one-ui")}
        />
        <SettingsChoiceRow
          label="Material"
          description={t(
            "mobile.appearance.AndroidNavigationAppearanceSection.standard-android-navigation-bar-and-side-rail",
          )}
          disabled={!isReady}
          selected={androidNavigationStyle === "material"}
          onPress={() => setAndroidNavigationStyle("material")}
          separated
        />
      </View>
    </SettingsSection>
  );
}
