import { officialReleaseVersion, desktopUpdateChannelOf } from "@t3tools/shared/cliRelease";
import { describe, expect, it } from "vite-plus/test";

import { isNightlyDesktopVersion } from "./updateChannels.ts";

describe("localized build versions", () => {
  it.each([
    ["0.1.4-nightly.20261029.3853", "nightly", "0.1.4-nightly.20261029.3853"],
    ["0.1.4-nightly.20261029.3853.zh.2", "nightly", "0.1.4-nightly.20261029.3853"],
    ["0.1.4", "latest", "0.1.4"],
  ] as const)("%s uses the %s channel and runtime %s", (version, channel, runtime) => {
    expect(desktopUpdateChannelOf(version)).toBe(channel);
    expect(isNightlyDesktopVersion(version)).toBe(channel === "nightly");
    expect(officialReleaseVersion(version)).toBe(runtime);
  });
});
