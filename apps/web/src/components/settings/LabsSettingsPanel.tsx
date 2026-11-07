import type { TranslationKey } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../i18n";
import { useAuth } from "@clerk/react";
import { Link } from "@tanstack/react-router";
import { managedCapabilityDenial } from "@t3tools/contracts";
import { ToolCallVisibility } from "@t3tools/contracts/settings";
import * as Schema from "effect/Schema";

import { hasCloudPublicConfig } from "~/cloud/publicConfig";
import { useT3ConnectAuthPrompt } from "../clerk/useT3ConnectAuthPrompt";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { ScopedSwitch } from "./ScopedSwitch";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { LegacyFeaturesSection } from "./SettingsPanels";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";
import { useOptionalSettingsScope } from "./SettingsScopeContext";
import { firstManagedDenial, usePrimaryManagedPolicy } from "~/state/managedPolicy";

/** Features still settling in, and legacy behavior kept for people who rely on it. */
export function LabsSettingsPanel() {
  const t = useTranslate();
  return (
    <SettingsPageContainer>
      <SettingsSection id="beta" title={t("settings.pages.LabsSettingsPanel.beta")}>
        <BoringSidebarRow />
        <BoringSidebarMultilineRow />
        <ToolCallVisibilityRow />
        {/* Clerk is only mounted when this build has T3 Connect. */}
        {hasCloudPublicConfig() ? <GuestLinksRowWithSignIn /> : <GuestLinksRow />}
        <LinkedEnvironmentsRow />
        <SimlockHostsRow />
      </SettingsSection>
      <LegacyFeaturesSection />
    </SettingsPageContainer>
  );
}

function BoringSidebarRow() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      {...searchableSetting("boring-sidebar")}
      description={t(
        "settings.pages.LabsSettingsPanel.group-sidebar-threads-into-project-folders-pinned-threads-stay-on-top-and-snoozed-and-settled-stay-below-the-folders",
      )}
      control={
        <Switch
          checked={settings.boringSidebarEnabled || settings.legacySidebarEnabled}
          // Turning it off also clears the opt-in of the removed legacy sidebar.
          onCheckedChange={(checked) =>
            updateSettings({ boringSidebarEnabled: Boolean(checked), legacySidebarEnabled: false })
          }
          aria-label={t("settings.pages.LabsSettingsPanel.boring-sidebar-group-by-project")}
        />
      }
    />
  );
}

function BoringSidebarMultilineRow() {
  const t = useTranslate();

  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      {...searchableSetting("boring-sidebar-multiline")}
      description={t("release4066.text149")}
      control={
        <Switch
          checked={settings.boringSidebarMultilineRows}
          onCheckedChange={(checked) =>
            updateSettings({ boringSidebarMultilineRows: Boolean(checked) })
          }
          aria-label={t("release4066.text150")}
        />
      }
    />
  );
}

const TOOL_CALL_VISIBILITY_LABELS: Record<ToolCallVisibility, TranslationKey> = {
  showAll: "web.dynamic.PullRequestChecksPopover.show-all",
  hideSuccessful: "release4262.hide-successful",
  hideAll: "release4262.hide-all",
  zen: "release4262.zen",
};

const isToolCallVisibility = Schema.is(ToolCallVisibility);

function ToolCallVisibilityRow() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      {...searchableSetting("tool-call-visibility")}
      description={t("release4262.hide-the-commands-edits-and-searches-agents-run-")}
      control={
        <div className="w-full sm:w-40">
          <Select
            value={settings.toolCallVisibility}
            onValueChange={(value) => {
              if (isToolCallVisibility(value)) updateSettings({ toolCallVisibility: value });
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-full min-w-0"
              aria-label={t("release4262.tool-calls-in-chat")}
            >
              <SelectValue>
                {t(TOOL_CALL_VISIBILITY_LABELS[settings.toolCallVisibility])}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup align="end" alignItemWithTrigger={false}>
              <SelectItem value="showAll">
                {t("web.dynamic.PullRequestChecksPopover.show-all")}
              </SelectItem>
              <SelectItem value="hideSuccessful">{t("release4262.hide-successful")}</SelectItem>
              <SelectItem value="hideAll">{t("release4262.hide-all")}</SelectItem>
              <SelectItem value="zen">{t("release4262.zen")}</SelectItem>
            </SelectPopup>
          </Select>
        </div>
      }
    />
  );
}

/** Signed out of T3 Connect, the row offers to sign in instead of its switch. */
function GuestLinksRowWithSignIn() {
  const t = useTranslate();
  const { isSignedIn } = useAuth();
  const { openAuthPrompt } = useT3ConnectAuthPrompt();
  // `isSignedIn` is undefined until Clerk loads.
  if (isSignedIn !== false) return <GuestLinksRow />;
  return (
    <SettingsRow
      {...searchableSetting("guest-links")}
      description={t(
        "settings.pages.LabsSettingsPanel.share-a-thread-with-a-guest-who-watches-it-live-in-their-browser-and-sends-messages-you-approve-sign-in-to-t3-connect-to-use-guest-links",
      )}
      control={
        <Button size="sm" variant="outline" onClick={openAuthPrompt}>
          {t("settings.pages.LabsSettingsPanel.sign-in")}
        </Button>
      }
    />
  );
}

function GuestLinksRow() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const scope = useOptionalSettingsScope();
  const primaryPolicy = usePrimaryManagedPolicy();
  // Guests arrive through T3 Connect, so a policy that turns Connect off turns this off too.
  const connectDenial = firstManagedDenial(
    scope
      ? scope.connectedEnvironments.map((environment) => environment.serverConfig?.managedPolicy)
      : [primaryPolicy],
    (policy) => managedCapabilityDenial(policy, "connect"),
  );
  return (
    <SettingsRow
      serverScoped
      {...searchableSetting("guest-links")}
      settingKeys={["guestSharingEnabled"]}
      // Turning guest links off still works without T3 Connect.
      managed={settings.guestSharingEnabled ? undefined : connectDenial}
      description={
        <>
          {t(
            "settings.pages.LabsSettingsPanel.share-a-thread-with-a-guest-who-watches-it-live-in-their-browser-and-sends-messages-you-approve-needs-t3-connect-sign-in-and-link-this-machine-in",
          )}{" "}
          <Link to="/settings/access" className="underline underline-offset-2">
            {t("settings.pages.LabsSettingsPanel.sharing-access")}
          </Link>
          {t("settings.pages.LabsSettingsPanel.while-it-is-off-every-guest-link-stops-working")}
        </>
      }
      control={
        <ScopedSwitch
          settingKeys={["guestSharingEnabled"]}
          checked={settings.guestSharingEnabled}
          onCheckedChange={(checked) => updateSettings({ guestSharingEnabled: Boolean(checked) })}
          aria-label={t("settings.pages.LabsSettingsPanel.guest-links")}
        />
      }
    />
  );
}

function LinkedEnvironmentsRow() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      serverScoped
      {...searchableSetting("linked-environments-beta")}
      settingKeys={["linkedEnvironmentsEnabled"]}
      description={
        <>
          {t(
            "settings.pages.LabsSettingsPanel.let-agents-here-work-on-your-other-machines-and-theirs-here-turn-it-on-for-each-machine-then-link-them-in",
          )}{" "}
          <Link to="/settings/connections" className="underline underline-offset-2">
            {t("settings.pages.LabsSettingsPanel.connections")}
          </Link>
          {t(
            "settings.pages.LabsSettingsPanel.while-it-is-off-nothing-new-starts-over-a-link-tasks-already-running-finish",
          )}
        </>
      }
      control={
        <ScopedSwitch
          settingKeys={["linkedEnvironmentsEnabled"]}
          checked={settings.linkedEnvironmentsEnabled}
          onCheckedChange={(checked) =>
            updateSettings({ linkedEnvironmentsEnabled: Boolean(checked) })
          }
          aria-label={t("settings.pages.LabsSettingsPanel.linked-environments")}
        />
      }
    />
  );
}

function SimlockHostsRow() {
  const t = useTranslate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      serverScoped
      {...searchableSetting("simlock-hosts")}
      settingKeys={["simlockDeviceHostsEnabled"]}
      description={
        <>
          {t("release4066.text151")}{" "}
          <a
            href="https://incubator.callstack.com/simlock/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Simlock
          </a>{" "}
          pool, added in{" "}
          <Link to="/settings/devices" className="underline underline-offset-2">
            {t("device.menu.devices")}
          </Link>
          {t("release4066.text152")}
        </>
      }
      control={
        <ScopedSwitch
          settingKeys={["simlockDeviceHostsEnabled"]}
          checked={settings.simlockDeviceHostsEnabled}
          onCheckedChange={(checked) =>
            updateSettings({ simlockDeviceHostsEnabled: Boolean(checked) })
          }
          aria-label={t("release4066.text153")}
        />
      }
    />
  );
}
