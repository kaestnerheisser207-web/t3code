import type { TFunction } from "i18next";
import {
  connectionStatusText,
  type EnvironmentConnectionPresentation,
} from "@t3tools/client-runtime/connection";

export interface SavedCloudEnvironmentConnectionPresentation {
  readonly buttonLabel: string;
  readonly statusText: string;
  readonly tone: "connected" | "connecting" | "error" | "idle";
}

export function presentSavedCloudEnvironmentConnection(
  connection: EnvironmentConnectionPresentation,
  t?: TFunction,
): SavedCloudEnvironmentConnectionPresentation {
  switch (connection.phase) {
    case "connected":
      return {
        buttonLabel: t?.("connection.connected") ?? "Connected",
        statusText: connectionStatusText(connection, t),
        tone: "connected",
      };
    case "connecting":
      return {
        buttonLabel: t?.("connection.connecting") ?? "Connecting…",
        statusText: connectionStatusText(connection, t),
        tone: "connecting",
      };
    case "reconnecting":
      return {
        buttonLabel: t?.("connection.reconnecting") ?? "Reconnecting…",
        statusText: connectionStatusText(connection, t),
        tone: "connecting",
      };
    case "unsupported":
      return {
        buttonLabel: t?.("connection.unsupported") ?? "Client not supported",
        statusText: connectionStatusText(connection, t),
        tone: "idle",
      };
    case "error":
      return {
        buttonLabel: t?.("connection.failed") ?? "Connection failed",
        statusText: connectionStatusText(connection, t),
        tone: "error",
      };
    case "offline":
      return {
        buttonLabel: t?.("connection.offline") ?? "Offline",
        statusText: connectionStatusText(connection, t),
        tone: "idle",
      };
    case "available":
      return {
        buttonLabel: t?.("web.dynamic.LinkMachineSelect.not-connected") ?? "Not connected",
        statusText: connectionStatusText(connection, t),
        tone: "idle",
      };
  }
}
