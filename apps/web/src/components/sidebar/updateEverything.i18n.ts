import type { TFunction } from "i18next";
import type { TranslationKey } from "@t3tools/client-runtime/i18n";

const REASONS: Readonly<Record<string, TranslationKey>> = {
  "not connected": "release3904.update-reason-0",
  "no permission": "release3904.update-reason-1",
  "already updating": "release3904.update-reason-2",
  "needs a manual update": "release3904.update-reason-3",
  "needs a newer desktop app": "release3904.update-reason-4",
  "runs a preview build": "release3904.update-reason-5",
  "switch the Mac app on that Mac": "release3904.update-reason-6",
  "its server is not connected, so its database cannot be checked": "release3904.update-reason-7",
  "no update available": "release3904.update-reason-8",
};

export function updateReasonText(reason: string, t: TFunction): string {
  const track = (name: string) =>
    name.toLowerCase() === "nightly"
      ? t("settings.support.nightly")
      : name.toLowerCase() === "stable"
        ? t("settings.support.stable")
        : name;
  const key = REASONS[reason];
  if (key) return t(key);
  let match = /^its server predates database checks; update it on (.+) first$/.exec(reason);
  if (match) return t("release3904.old-server", { track: track(match[1]!) });
  match = /^(.+) predates database checks; wait for a newer (.+) release$/.exec(reason);
  if (match) return t("release3904.old-release", { version: match[1]!, track: track(match[2]!) });
  match =
    /^its database has changes (.+) does not support yet; stay on (.+) until (.+) has them$/.exec(
      reason,
    );
  if (match)
    return t("release3904.database-ahead", {
      version: match[1]!,
      from: track(match[2]!),
      to: track(match[3]!),
    });
  match = /^on the (.+) channel$/.exec(reason);
  if (match) return t("release3904.other-track", { track: track(match[1]!) });
  match = /^run `(.+)` there$/.exec(reason);
  if (match) return t("release3904.run-command", { command: match[1]! });
  return reason;
}
