import {
  WorkspaceBreadcrumb,
  WorkspaceBreadcrumbItem,
  WorkspaceBreadcrumbSeparator,
} from "../WorkspaceBreadcrumb";
import type { TFunction } from "i18next";
import type { TranslationKey } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../i18n";
import { SETTINGS_SECTION_KEYS } from "./settingsSearch";

const SETTINGS_BREADCRUMB_KEYS: Readonly<Record<string, TranslationKey>> = {
  ...SETTINGS_SECTION_KEYS,
  "/settings/open-source-licenses": "settings.openSourceLicenses",
};

function settingsBreadcrumbLabel(pathname: string, t: TFunction): string | null {
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const key = SETTINGS_BREADCRUMB_KEYS[normalizedPathname];
  return key ? t(key) : null;
}

export function SettingsBreadcrumb({ pathname }: { pathname: string }) {
  const t = useTranslate();
  const sectionLabel = settingsBreadcrumbLabel(pathname, t);

  return (
    <WorkspaceBreadcrumb ariaLabel={t("settings.breadcrumb")}>
      {sectionLabel ? (
        <>
          <WorkspaceBreadcrumbItem>{t("settings.title")}</WorkspaceBreadcrumbItem>
          <WorkspaceBreadcrumbSeparator />
        </>
      ) : null}
      <WorkspaceBreadcrumbItem current className="truncate">
        {sectionLabel ?? t("settings.title")}
      </WorkspaceBreadcrumbItem>
    </WorkspaceBreadcrumb>
  );
}
