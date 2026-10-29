import type { TFunction } from "i18next";
import type { ExecutionEnvironmentPlatformOs, FileManagerRevealKind } from "@t3tools/contracts";

export function revealInFileExplorerLabel(platform: string, t?: TFunction): string {
  const normalized = platform.toLowerCase();
  if (normalized.includes("mac")) return t?.("files.action.finder") ?? "Reveal in Finder";
  if (normalized.includes("win")) return t?.("files.action.explorer") ?? "Reveal in File Explorer";
  return t?.("files.action.fileManager") ?? "Reveal in Files";
}

export function revealInFileExplorerLabelForOs(
  os: ExecutionEnvironmentPlatformOs,
  t?: TFunction,
): string {
  if (os === "darwin") return t?.("files.action.finder") ?? "Reveal in Finder";
  if (os === "windows") return t?.("files.action.explorer") ?? "Reveal in File Explorer";
  return t?.("files.action.fileManager") ?? "Reveal in Files";
}

export function revealInFileExplorerLabelForKind(
  kind: FileManagerRevealKind,
  t?: TFunction,
): string {
  if (kind === "finder") return t?.("files.action.finder") ?? "Reveal in Finder";
  if (kind === "file-explorer") return t?.("files.action.explorer") ?? "Reveal in File Explorer";
  return t?.("files.action.fileManager") ?? "Reveal in Files";
}

export function localizeFileExplorerLabel(label: string, t: TFunction): string {
  if (label === "Reveal in Finder") return t("files.action.finder");
  if (label === "Reveal in File Explorer") return t("files.action.explorer");
  if (label === "Reveal in Files") return t("files.action.fileManager");
  return label;
}
