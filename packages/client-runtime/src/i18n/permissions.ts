import type { TFunction } from "i18next";
import { sessionPermissionsUnavailableMessage } from "@t3tools/shared/authScopeOptions";

export function sessionPermissionsText(
  input: Parameters<typeof sessionPermissionsUnavailableMessage>[0],
  t: TFunction,
): string {
  const message = sessionPermissionsUnavailableMessage(input);
  const keys: Record<
    string,
    | "release3904.connect-to-this-environment-to-view-this-session-s-permissions"
    | "release3904.this-environment-did-not-accept-your-session-reconnect-to-try-again"
    | "release3904.could-not-verify-your-permissions-retrying-automatically"
    | "release3904.checking-permissions"
  > = {
    "Connect to this environment to view this session’s permissions.":
      "release3904.connect-to-this-environment-to-view-this-session-s-permissions",
    "This environment did not accept your session. Reconnect to try again.":
      "release3904.this-environment-did-not-accept-your-session-reconnect-to-try-again",
    "Could not verify your permissions. Retrying automatically.":
      "release3904.could-not-verify-your-permissions-retrying-automatically",
    "Checking permissions…": "release3904.checking-permissions",
  };
  const key = keys[message];
  return key ? t(key) : message;
}
