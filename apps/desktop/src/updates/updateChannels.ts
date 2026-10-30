const PRERELEASE_VERSION_PATTERN = /^[^-+]+-(?:nightly|preview)\.\d{8}\.\d+(?:\.zh\.[1-9]\d*)?$/;

export function isNightlyDesktopVersion(version: string): boolean {
  return PRERELEASE_VERSION_PATTERN.test(version);
}
