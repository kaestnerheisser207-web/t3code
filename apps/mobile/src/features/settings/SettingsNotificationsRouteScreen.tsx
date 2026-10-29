import { useTranslate } from "../../i18n";
import * as Dialog from "../../components/ui/Dialog";
import { AuthRelayWriteScope } from "@t3tools/contracts";
import { readEnvironmentScope } from "../../state/session";
import { ScreenScrollView as ScrollView } from "../../components/ui/ScreenScrollView";
import { useAuth } from "@clerk/expo";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as Notifications from "expo-notifications";
import { useNavigation } from "@react-navigation/native";
import * as Effect from "effect/Effect";
import { AsyncResult } from "effect/reactivity";
import { useRef, useState, useSyncExternalStore } from "react";
import { Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText as Text } from "../../components/ui/AppText";
import {
  isAtomCommandInterrupted,
  reportAtomCommandResult,
  settleAsyncResult,
  settlePromise,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { supportsAgentAwarenessPush } from "../agent-awareness/capabilities";
import {
  openAndroidLiveUpdateSettings,
  supportsAndroidLiveUpdateSettings,
} from "../agent-awareness/androidNotifications";
import { setLiveActivityUpdatesEnabled } from "../agent-awareness/liveActivityPreferences";
import { requestAgentNotificationPermission } from "../agent-awareness/notificationPermissions";
import {
  getAgentAwarenessRegistrationStatus,
  refreshAgentAwarenessRegistration,
  subscribeAgentAwarenessRegistrationStatus,
} from "../agent-awareness/remoteRegistration";
import { refreshManagedRelayEnvironments } from "../cloud/managedRelayState";
import { hasCloudPublicConfig, resolveRelayClerkTokenOptions } from "../cloud/publicConfig";
import { makePermissionStatusAtom } from "../../lib/permissionStatusAtom";
import { runtime } from "../../lib/runtime";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import { useSavedRemoteConnections } from "../../state/use-remote-environment-registry";
import { SettingsRow } from "./components/SettingsRow";
import { SettingsSection } from "./components/SettingsSection";
import { SettingsSwitchRow } from "./components/SettingsSwitchRow";
import { SettingsScreen } from "./components/SettingsScreen";
import { resolveAgentAwarenessPlatformPresentation } from "./SettingsRouteScreen.logic";

type NotificationStatus = "checking" | "enabled" | "disabled" | "unsupported";
type LiveActivityStatus = "checking" | "enabled" | "disabled" | "signed-out" | "linking";

const notificationStatusAtom = makePermissionStatusAtom<NotificationStatus>({
  label: "mobile:notification-permission",
  initial: "checking",
  read: async () => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return "unsupported";
    const result = await settlePromise(() => Notifications.getPermissionsAsync());
    if (result._tag === "Failure") {
      reportAtomCommandResult(result, { label: "notification permission refresh" });
      return "disabled";
    }
    return result.value.granted ? "enabled" : "disabled";
  },
});

type LiveActivityBasis = {
  readonly isLoaded: boolean;
  readonly isSignedIn: boolean | undefined;
  readonly preferencesResult: unknown;
};

function liveActivityStatusFrom(
  isLoaded: boolean,
  isSignedIn: boolean | undefined,
  preferencesResult: AsyncResult.AsyncResult<{ readonly liveActivitiesEnabled?: boolean }, unknown>,
): LiveActivityStatus {
  if (!isLoaded) return "checking";
  if (!isSignedIn) return "signed-out";
  if (AsyncResult.isFailure(preferencesResult)) return "enabled";
  if (!AsyncResult.isSuccess(preferencesResult)) return "checking";
  return preferencesResult.value.liveActivitiesEnabled === false ? "disabled" : "enabled";
}

function useDeviceRegistered(): boolean {
  const status = useSyncExternalStore(
    subscribeAgentAwarenessRegistrationStatus,
    getAgentAwarenessRegistrationStatus,
    () => "unknown" as const,
  );
  return status === "registered";
}

export function SettingsNotificationsRouteScreen() {
  const t = useTranslate();
  if (!hasCloudPublicConfig()) {
    return (
      <SettingsScreen title={t("mobile.settings.SettingsNotificationsRouteScreen.notifications")}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="px-5 pt-4"
        >
          <Text className="text-base text-foreground-muted">
            {t(
              "mobile.settings.SettingsNotificationsRouteScreen.notifications-require-t3-connect-in-this-app-build",
            )}
          </Text>
        </ScrollView>
      </SettingsScreen>
    );
  }

  return <ConfiguredSettingsNotificationsRouteScreen />;
}

function ConfiguredSettingsNotificationsRouteScreen() {
  const t = useTranslate();
  const preferencesResult = useAtomValue(mobilePreferencesAtom);
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const agentAwarenessPushAvailable = supportsAgentAwarenessPush();
  const agentAwarenessPlatform = resolveAgentAwarenessPlatformPresentation(Platform.OS);
  const agentAwarenessSubtitle =
    Platform.OS === "android" && !agentAwarenessPushAvailable
      ? t("mobile.notifications.install-a-newer-app-build-to-enable-notifications")
      : agentAwarenessPlatform.subtitle;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { getToken, isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { savedConnectionsById } = useSavedRemoteConnections();
  const notificationStatus = useAtomValue(notificationStatusAtom);
  const setNotificationStatus = useAtomSet(notificationStatusAtom);
  // A write in progress or a failed one shows its own status until the auth or
  // preference state it was based on changes.
  const [liveActivityOverride, setLiveActivityOverride] = useState<{
    readonly status: LiveActivityStatus;
    readonly basis: LiveActivityBasis;
  } | null>(null);
  const liveActivityBasis: LiveActivityBasis = { isLoaded, isSignedIn, preferencesResult };
  const liveActivityStatus =
    liveActivityOverride !== null &&
    liveActivityOverride.basis.isLoaded === isLoaded &&
    liveActivityOverride.basis.isSignedIn === isSignedIn &&
    liveActivityOverride.basis.preferencesResult === preferencesResult
      ? liveActivityOverride.status
      : liveActivityStatusFrom(isLoaded, isSignedIn, preferencesResult);
  const setLiveActivityStatus = (status: LiveActivityStatus) =>
    setLiveActivityOverride({ status, basis: liveActivityBasis });
  const liveActivityWriteInFlight = useRef(false);
  const deviceRegistered = useDeviceRegistered();
  const liveActivitiesPreferenceEnabled = AsyncResult.isSuccess(preferencesResult)
    ? preferencesResult.value.liveActivitiesEnabled !== false
    : true;
  const canClearLiveActivitiesPreference =
    AsyncResult.isSuccess(preferencesResult) &&
    preferencesResult.value.liveActivitiesEnabled !== false;

  const connections = Object.values(savedConnectionsById);
  const environmentCount = connections.length;

  const requestNotifications = async () => {
    const result = await settleAsyncResult(() =>
      runtime.runPromiseExit(
        requestAgentNotificationPermission.pipe(
          Effect.tap((permission) =>
            permission.type === "granted" ? refreshAgentAwarenessRegistration() : Effect.void,
          ),
        ),
      ),
    );
    if (result._tag === "Failure") {
      if (!isAtomCommandInterrupted(result)) {
        const error = squashAtomCommandFailure(result);
        Dialog.alert(
          t("mobile.notifications.notifications-unavailable"),
          error instanceof Error
            ? error.message
            : t("mobile.notifications.could-not-request-notification-permission"),
        );
      }
      return;
    }
    if (result.value.type === "granted") {
      setNotificationStatus("enabled");
      if (getAgentAwarenessRegistrationStatus() === "registered") {
        Dialog.alert(
          t("mobile.notifications.notifications-enabled"),
          t("mobile.notifications.agent-notifications-are-enabled-for-this-device"),
        );
      } else {
        Dialog.alert(
          t("mobile.notifications.couldn-t-finish-enabling-notifications"),
          t(
            "mobile.notifications.notification-access-was-granted-but-this-device-could-not-be-registered-with-t3-connect-notifications-will-start-once-registration-succeeds",
          ),
        );
      }
      return;
    }
    if (result.value.type === "unsupported") {
      setNotificationStatus("unsupported");
      Dialog.alert(
        t("mobile.notifications.notifications-unavailable"),
        t("mobile.notifications.agent-notifications-are-unavailable-on-this-platform"),
      );
      return;
    }
    setNotificationStatus("disabled");
    if (result.value.canAskAgain) {
      Dialog.alert(
        t("mobile.notifications.notifications-disabled"),
        t("mobile.notifications.notifications-were-not-enabled"),
      );
      return;
    }
    Dialog.alert(
      t("mobile.notifications.notifications-disabled"),
      t("mobile.notifications.notifications-were-denied-for-this-app-open-settings-to-enable-them"),
      [
        { text: t("mobile.notifications.cancel"), style: "cancel" },
        {
          text: t("mobile.notifications.open-settings"),
          onPress: () => void Linking.openSettings(),
        },
      ],
    );
  };

  const promptSignIn = () => {
    Dialog.alert(
      t("mobile.notifications.sign-in-to-t3-connect"),
      t(
        "mobile.notifications.live-activity-updates-require-t3-connect-so-relay-can-deliver-updates-to-this-device",
      ),
      [
        { text: t("mobile.notifications.cancel"), style: "cancel" },
        {
          text: "Continue",
          onPress: () => navigation.navigate("SettingsAuth"),
        },
      ],
    );
  };

  const linkEnvironments = async () => {
    if (!isSignedIn) {
      promptSignIn();
      return;
    }

    setLiveActivityStatus("linking");
    if (Platform.OS === "android") {
      const permission = await settleAsyncResult(() =>
        runtime.runPromiseExit(requestAgentNotificationPermission),
      );
      if (permission._tag === "Failure") {
        setLiveActivityStatus("disabled");
        const error = squashAtomCommandFailure(permission);
        Dialog.alert(
          t("mobile.notifications.ongoing-activity-unavailable"),
          error instanceof Error
            ? error.message
            : t("mobile.notifications.could-not-enable-agent-notifications"),
        );
        return;
      }
      if (permission.value.type !== "granted") {
        setLiveActivityStatus("disabled");
        Dialog.alert(
          t("mobile.notifications.notification-permission-needed"),
          t(
            "mobile.notifications.enable-notifications-in-system-settings-to-show-ongoing-agent-activity",
          ),
          [
            { text: t("mobile.notifications.cancel"), style: "cancel" },
            {
              text: t("mobile.notifications.open-settings"),
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
        return;
      }
      setNotificationStatus("enabled");
    }
    const tokenResult = await settlePromise(() => getToken(resolveRelayClerkTokenOptions()));
    if (tokenResult._tag === "Failure") {
      setLiveActivityStatus("disabled");
      const error = squashAtomCommandFailure(tokenResult);
      Dialog.alert(
        Platform.OS === "android"
          ? t("mobile.notifications.ongoing-activity-unavailable")
          : t("mobile.notifications.live-activities-unavailable"),
        error instanceof Error
          ? error.message
          : t("mobile.notifications.could-not-enable-agent-activity-updates"),
      );
      return;
    }
    if (!tokenResult.value) {
      promptSignIn();
      setLiveActivityStatus("signed-out");
      return;
    }

    const updateResult = await settleAsyncResult(() =>
      runtime.runPromiseExit(
        setLiveActivityUpdatesEnabled({
          canConfigureEnvironment: (environmentId) =>
            readEnvironmentScope(environmentId, AuthRelayWriteScope),
          enabled: true,
          previousEnabled: liveActivitiesPreferenceEnabled,
          clerkToken: tokenResult.value,
          connections,
        }),
      ),
    );
    if (updateResult._tag === "Failure") {
      setLiveActivityStatus("disabled");
      if (!isAtomCommandInterrupted(updateResult)) {
        const error = squashAtomCommandFailure(updateResult);
        Dialog.alert(
          Platform.OS === "android"
            ? t("mobile.notifications.ongoing-activity-unavailable")
            : t("mobile.notifications.live-activities-unavailable"),
          error instanceof Error
            ? error.message
            : t("mobile.notifications.could-not-enable-agent-activity-updates"),
        );
      }
      return;
    }

    savePreferences({ liveActivitiesEnabled: true });
    refreshManagedRelayEnvironments();
    setLiveActivityStatus("enabled");
    // Environment linking can precede device registration; only registered devices can receive Live Activities.
    if (getAgentAwarenessRegistrationStatus() === "registered") {
      Dialog.alert(
        Platform.OS === "android"
          ? t("mobile.notifications.ongoing-activity-enabled")
          : t("mobile.notifications.live-activities-enabled"),
        environmentCount > 0
          ? t(
              "mobile.notifications.agent-activity-updates-are-enabled-for-environments-this-connection-can-configure",
            )
          : t(
              "mobile.notifications.agent-activity-updates-are-enabled-add-an-environment-to-start-receiving-updates",
            ),
      );
    } else {
      Dialog.alert(
        t("mobile.notifications.couldn-t-finish-enabling-activity-updates"),
        t(
          "mobile.notifications.this-device-could-not-be-registered-with-t3-connect-so-activity-updates-won-t-appear-yet-they-ll-start-once-registration-succeeds",
        ),
      );
    }
  };

  const handleDeviceNotificationsChange = (enabled: boolean) => {
    if (enabled) {
      if (!isSignedIn) {
        promptSignIn();
        return;
      }
      void requestNotifications();
      return;
    }

    Dialog.alert(
      t("mobile.notifications.disable-notifications"),
      t("mobile.notifications.open-system-settings-to-disable-notifications-for-t3-code"),
      [
        { text: t("mobile.notifications.cancel"), style: "cancel" },
        {
          text: t("mobile.notifications.open-settings"),
          onPress: () => void Linking.openSettings(),
        },
      ],
    );
  };

  async function disableLiveActivities() {
    let token: string | null = null;
    if (isSignedIn) {
      const tokenResult = await settlePromise(() => getToken(resolveRelayClerkTokenOptions()));
      if (tokenResult._tag === "Failure") {
        setLiveActivityStatus("enabled");
        reportAtomCommandResult(tokenResult, {
          label: "live activity disable token lookup",
        });
        return;
      }
      token = tokenResult.value;
    }

    const updateResult = await settleAsyncResult(() =>
      runtime.runPromiseExit(
        setLiveActivityUpdatesEnabled({
          canConfigureEnvironment: (environmentId) =>
            readEnvironmentScope(environmentId, AuthRelayWriteScope),
          enabled: false,
          previousEnabled: liveActivitiesPreferenceEnabled,
          clerkToken: token,
          connections,
        }),
      ),
    );
    if (updateResult._tag === "Failure") {
      setLiveActivityStatus(isSignedIn ? "enabled" : "signed-out");
      reportAtomCommandResult(updateResult, {
        label: "live activity disable",
      });
      return;
    }
    savePreferences({ liveActivitiesEnabled: false });
    refreshManagedRelayEnvironments();
    setLiveActivityStatus("disabled");
  }

  // Both writers settle their own failures, so awaiting them never throws.
  const handleLiveActivitiesChange = async (enabled: boolean) => {
    if (liveActivityWriteInFlight.current) return;
    if (!enabled) {
      liveActivityWriteInFlight.current = true;
      setLiveActivityStatus("linking");
      await disableLiveActivities();
      liveActivityWriteInFlight.current = false;
      return;
    }

    if (!isSignedIn) {
      promptSignIn();
      return;
    }

    liveActivityWriteInFlight.current = true;
    await linkEnvironments();
    liveActivityWriteInFlight.current = false;
  };

  return (
    <SettingsScreen title={t("mobile.settings.SettingsNotificationsRouteScreen.notifications")}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pt-4"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 18) + 18,
        }}
      >
        <SettingsSection
          title={t("mobile.settings.SettingsNotificationsRouteScreen.agent-activity")}
        >
          <SettingsSwitchRow
            icon="bell.badge"
            label={t("mobile.settings.SettingsNotificationsRouteScreen.device-notifications")}
            disabled={
              !agentAwarenessPlatform.supported ||
              !agentAwarenessPushAvailable ||
              notificationStatus === "checking" ||
              notificationStatus === "unsupported"
            }
            subtitle={agentAwarenessSubtitle}
            value={
              agentAwarenessPushAvailable && notificationStatus === "enabled" && deviceRegistered
            }
            onValueChange={handleDeviceNotificationsChange}
          />
          <SettingsSwitchRow
            disabled={
              !agentAwarenessPlatform.supported ||
              !agentAwarenessPushAvailable ||
              !isLoaded ||
              liveActivityStatus === "checking" ||
              liveActivityStatus === "linking"
            }
            icon="bolt.circle"
            label={
              Platform.OS === "android"
                ? supportsAndroidLiveUpdateSettings()
                  ? t("mobile.notifications.agent-live-updates")
                  : t("mobile.notifications.ongoing-agent-activity")
                : t("mobile.notifications.live-activity-updates")
            }
            subtitle={agentAwarenessSubtitle}
            value={
              agentAwarenessPushAvailable &&
              (liveActivityStatus === "enabled" || liveActivityStatus === "linking") &&
              deviceRegistered
            }
            onValueChange={(enabled) => void handleLiveActivitiesChange(enabled)}
          />
          {liveActivityStatus === "signed-out" && canClearLiveActivitiesPreference ? (
            <SettingsRow
              icon="bolt.circle"
              label={t(
                "mobile.settings.SettingsNotificationsRouteScreen.turn-off-live-activity-preference",
              )}
              onPress={() => void handleLiveActivitiesChange(false)}
            />
          ) : null}
          {supportsAndroidLiveUpdateSettings() ? (
            <SettingsRow
              icon="bolt.circle"
              label={t("mobile.settings.SettingsNotificationsRouteScreen.live-update-settings")}
              onPress={() => {
                void openAndroidLiveUpdateSettings().catch(() => {
                  Dialog.alert(
                    t("mobile.notifications.couldn-t-open-settings"),
                    t(
                      "mobile.notifications.open-android-settings-select-t3-code-then-enable-live-updates-in-notifications",
                    ),
                  );
                });
              }}
            />
          ) : null}
        </SettingsSection>
      </ScrollView>
    </SettingsScreen>
  );
}
