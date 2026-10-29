import type { DesktopUpdateChannel } from "@t3tools/contracts";

// Localized fork builds append `.zh.<build>` so translation-only releases still sort newer.
const LOCALIZED_BUILD_SUFFIX = /\.zh\.\d+$/;
const NIGHTLY_VERSION_PATTERN = /^[^-+]+-nightly\.\d{8}\.\d+(?:\.zh\.\d+)?$/;
// Preview builds share nightly branding but ship without an update feed.
const PRERELEASE_VERSION_PATTERN = /^[^-+]+-(?:nightly|preview)\.\d{8}\.\d+(?:\.zh\.\d+)?$/;

export function isNightlyDesktopVersion(version: string): boolean {
  return PRERELEASE_VERSION_PATTERN.test(version);
}

export function resolveDefaultDesktopUpdateChannel(appVersion: string): DesktopUpdateChannel {
  return NIGHTLY_VERSION_PATTERN.test(appVersion) ? "nightly" : "latest";
}

/** The official release whose runtime archives remote hosts download. */
export function officialReleaseVersion(appVersion: string): string {
  return appVersion.replace(LOCALIZED_BUILD_SUFFIX, "");
}
