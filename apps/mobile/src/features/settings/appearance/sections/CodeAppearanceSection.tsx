import { useTranslate } from "../../../../i18n";
import {
  CODE_FONT_SIZE_STEP,
  MAX_CODE_FONT_SIZE,
  MIN_CODE_FONT_SIZE,
} from "../../../../lib/appearancePreferences";
import { SettingsSection } from "../../components/SettingsSection";
import { SettingsSwitchRow } from "../../components/SettingsSwitchRow";
import { useAppearancePreferences } from "../AppearancePreferencesProvider";
import {
  AppearancePreviewSeparator,
  CodeAppearancePreview,
} from "../components/AppearancePreviews";
import { FontSizeSliderRow } from "../components/FontSizeSliderRow";

export function CodeAppearanceSection() {
  const t = useTranslate();
  const { isReady, appearance, setCodeFontSize, setCodeWordBreak } = useAppearancePreferences();
  const custom = appearance.isCodeFontSizeCustom;

  const handleToggleCustom = (enabled: boolean) => {
    setCodeFontSize(enabled ? appearance.codeFontSize : null);
  };

  return (
    <SettingsSection title={t("mobile.appearance.CodeAppearanceSection.code-diffs")}>
      <CodeAppearancePreview
        fontSize={appearance.codeFontSize}
        wordBreak={appearance.codeWordBreak}
      />
      <AppearancePreviewSeparator />
      <SettingsSwitchRow
        disabled={!isReady}
        icon="chevron.left.forwardslash.chevron.right"
        label={t("mobile.appearance.CodeAppearanceSection.custom-font-size")}
        onValueChange={handleToggleCustom}
        value={custom}
      />
      {custom ? (
        <FontSizeSliderRow
          disabled={!isReady}
          icon="textformat.size"
          label={t("mobile.appearance.CodeAppearanceSection.font-size")}
          max={MAX_CODE_FONT_SIZE}
          min={MIN_CODE_FONT_SIZE}
          onChange={setCodeFontSize}
          step={CODE_FONT_SIZE_STEP}
          value={appearance.codeFontSize}
          valueLabel={`${appearance.codeFontSize} pt`}
        />
      ) : null}
      <SettingsSwitchRow
        disabled={!isReady}
        icon="text.word.spacing"
        label={t("mobile.appearance.CodeAppearanceSection.word-break")}
        onValueChange={setCodeWordBreak}
        value={appearance.codeWordBreak}
      />
    </SettingsSection>
  );
}
