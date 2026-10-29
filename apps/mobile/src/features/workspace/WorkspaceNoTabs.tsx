import { useTranslate } from "../../i18n";
import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import { EmptyState } from "../../components/ui/EmptyState";
import { openSettings } from "../settings/settings-navigation";

export function WorkspaceNoTabs() {
  const t = useTranslate();
  const navigation = useNavigation();
  return (
    <View className="flex-1 items-center justify-center bg-screen">
      <EmptyState
        title={t("mobile.surfaces.WorkspaceNoTabs.all-sections-are-hidden")}
        detail={t("mobile.surfaces.WorkspaceNoTabs.show-a-section-to-add-it-back-to-navigation")}
        actionLabel="Edit navigation tabs"
        variant="plain"
        onAction={() => openSettings(navigation, "SettingsNavigation")}
      />
    </View>
  );
}
