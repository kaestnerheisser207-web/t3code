import { useTranslate } from "../../i18n";
import { settlePromise } from "@t3tools/client-runtime/state/runtime";
import { useState } from "react";
import type { TranslationKey } from "@t3tools/client-runtime/i18n";

import {
  hasDesktopNotifications,
  hasNotificationSound,
  NOTIFICATION_MODE_KEYS,
  unlockNotificationAudio,
} from "../../threadNotifications";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SettingsRow } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";

export function NotificationSettings() {
  const t = useTranslate();
  const mode = useScopedSettings((settings) => settings.notificationMode);
  const updateSettings = useUpdateScopedSettings();
  const [permissionMessage, setPermissionMessage] = useState<TranslationKey | null>(null);
  const [requesting, setRequesting] = useState(false);

  return (
    <SettingsRow
      {...searchableSetting("thread-notifications")}
      description={
        permissionMessage
          ? t(permissionMessage)
          : t(
              "settings.support.system-alerts-when-a-thread-finishes-fails-or-needs-input-or-approval",
            )
      }
      control={
        <Select
          value={mode}
          disabled={requesting}
          onValueChange={async (value) => {
            if (
              value !== "off" &&
              value !== "notifications" &&
              value !== "sound" &&
              value !== "notifications-and-sound"
            )
              return;
            setPermissionMessage(null);
            if (hasNotificationSound(value)) unlockNotificationAudio();
            if (hasDesktopNotifications(value)) {
              if (typeof Notification === "undefined" || !window.isSecureContext) {
                setPermissionMessage(
                  "settings.support.notifications-need-a-supported-browser-over-https-or-the-desktop-app-sound",
                );
                return;
              }
              setRequesting(true);
              const permission = await settlePromise(() => Notification.requestPermission());
              setRequesting(false);
              if (permission._tag === "Failure") {
                setPermissionMessage(
                  "settings.support.notifications-are-unavailable-in-this-browser-sound-only-is-still-available",
                );
                return;
              }
              if (permission.value !== "granted") {
                setPermissionMessage(
                  "settings.support.allow-notifications-in-your-browser-or-system-settings-then-choose-this-option",
                );
                return;
              }
            }
            updateSettings({ notificationMode: value });
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-56"
            aria-label={t("settings.support.thread-notifications")}
          >
            <SelectValue>{t(NOTIFICATION_MODE_KEYS[mode])}</SelectValue>
          </SelectTrigger>
          <SelectPopup align="end" alignItemWithTrigger={false}>
            {Object.entries(NOTIFICATION_MODE_KEYS).map(([value, labelKey]) => (
              <SelectItem key={value} hideIndicator value={value}>
                {t(labelKey)}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      }
    />
  );
}
