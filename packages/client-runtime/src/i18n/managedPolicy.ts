import type { TFunction } from "i18next";
import { runtimeModeText } from "./runtimeMode.ts";

export function managedPolicyText(t: TFunction, message: string): string {
  const managed = /^Managed by ([\s\S]+)\.$/.exec(message);
  if (managed) return t("release4066.text189", { value0: managed[1]! });
  const updates =
    /^([\s\S]+) manages T3 Code updates\.( Only stable releases can be installed\.)?$/.exec(
      message,
    );
  if (updates)
    return t(updates[2] ? "release4066.policy.stable" : "release4066.policy.updates", {
      organization: updates[1]!,
    });
  const telemetry = /^([\s\S]+) turned off anonymous usage data\.$/.exec(message);
  if (telemetry) return t("release4066.policy.telemetry", { organization: telemetry[1]! });
  const denied =
    /^([\s\S]+)'s policy does not allow (connecting from other devices|T3 Connect|webhook tasks|importing browser cookies)\.$/.exec(
      message,
    );
  if (denied) {
    const capability =
      denied[2] === "connecting from other devices"
        ? t("release4066.policy.remote")
        : denied[2] === "webhook tasks"
          ? t("release4066.policy.webhook")
          : denied[2] === "importing browser cookies"
            ? t("release4066.policy.cookies")
            : "T3 Connect";
    return t("release4066.policy.denied", { organization: denied[1]!, capability });
  }
  const ceiling =
    /^([\s\S]+) limits threads to (Supervised|Auto-accept edits|Auto|Full access)\.$/.exec(message);
  if (ceiling) {
    const mode =
      ceiling[2] === "Supervised"
        ? "approval-required"
        : ceiling[2] === "Auto-accept edits"
          ? "auto-accept-edits"
          : ceiling[2] === "Auto"
            ? "auto"
            : "full-access";
    return t("release4066.policy.ceiling", {
      organization: ceiling[1]!,
      mode: runtimeModeText(t, mode).label,
    });
  }
  return message;
}
