import { describe, expect, it } from "vite-plus/test";

import { resolveLanguage } from "./language.ts";

describe("interface language negotiation", () => {
  it.each([
    [["zh-CN"], "zh-CN"],
    [["zh-SG"], "zh-CN"],
    [["zh-Hans-HK"], "zh-CN"],
    [["zh-TW"], "en"],
    [["zh-Hant-CN"], "en"],
    [["zh-HK", "zh-CN"], "zh-CN"],
    [["en-GB", "zh-CN"], "en"],
    [["invalid locale", "zh_CN"], "zh-CN"],
    [["ja-JP"], "en"],
    [[], "en"],
  ] as const)("resolves host preferences %j to %s", (languages, expected) => {
    expect(resolveLanguage("system", languages)).toBe(expected);
    expect(resolveLanguage("en", languages)).toBe("en");
    expect(resolveLanguage("zh-CN", languages)).toBe("zh-CN");
  });
});
