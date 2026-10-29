import type { TFunction } from "i18next";
import {
  connectionStatusText,
  type EnvironmentConnectionPresentation,
} from "@t3tools/client-runtime/connection";

export function environmentStatusText(
  connection: EnvironmentConnectionPresentation,
  t?: TFunction,
): string {
  return connection.phase === "unsupported" && connection.error !== null
    ? connection.error
    : connectionStatusText(connection, t);
}
