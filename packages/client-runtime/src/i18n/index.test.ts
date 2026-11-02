import { describe, expect, it } from "vite-plus/test";

import { createI18n, resources, usageAccessibilityLabel, managedPolicyText } from "./index.ts";

describe("bundled translations", () => {
  it("preserves interpolation parameters in translated messages", () => {
    const parameters = (message: string) =>
      [...message.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((match) => match[1]).sort();
    const components = (message: string) =>
      [...message.matchAll(/<\/?([a-zA-Z]\w*)\s*\/?>/g)].map((match) => match[1]).sort();
    const componentParents = (message: string) => {
      const stack: string[] = [];
      const parents: string[] = [];
      for (const match of message.matchAll(/<(\/?)([a-zA-Z]\w*)\s*(\/?)>/g)) {
        const name = match[2]!;
        if (match[1]) {
          expect(stack.pop()).toBe(name);
        } else {
          parents.push(`${name}:${stack.at(-1) ?? "root"}`);
          if (!match[3]) stack.push(name);
        }
      }
      expect(stack).toEqual([]);
      return parents.sort();
    };
    for (const key of Object.keys(resources.en.translation) as Array<
      keyof typeof resources.en.translation
    >) {
      expect(resources["zh-CN"].translation[key], key).not.toContain("\uFFFD");
      expect(parameters(resources["zh-CN"].translation[key]), key).toEqual(
        parameters(resources.en.translation[key]),
      );
      expect(components(resources["zh-CN"].translation[key]), key).toEqual(
        components(resources.en.translation[key]),
      );
      if (key.includes(".rich.")) {
        expect(componentParents(resources["zh-CN"].translation[key]), key).toEqual(
          componentParents(resources.en.translation[key]),
        );
      }
    }
  });

  it("isolates client languages and preserves technical values during switching", async () => {
    const first = createI18n("zh-CN");
    const second = createI18n("en");
    const app = "<workspace> {{unresolved}}";
    expect(first.t("desktop.menu.about", { app })).toContain(app);
    const english = second.t("desktop.menu.about", { app });
    const organization = "Example's <workspace>";
    const policy = `${organization}'s policy does not allow webhook tasks.`;
    expect(managedPolicyText(first.t, policy)).toBe(
      `${organization} 的策略不允许运行 webhook 任务。`,
    );
    expect(managedPolicyText(second.t, policy)).toBe(policy);
    expect(managedPolicyText(first.t, `${organization} limits threads to Full access.`)).toContain(
      organization,
    );
    expect(
      managedPolicyText(
        first.t,
        `${organization} manages T3 Code updates. Only stable releases can be installed.`,
      ),
    ).toContain("仅允许安装正式版");
    const raw = "A user message about manages T3 Code updates. Keep this verbatim.";
    expect(managedPolicyText(first.t, raw)).toBe(raw);
    await first.changeLanguage("en");
    expect(first.t("desktop.menu.about", { app })).toBe(english);
    await first.changeLanguage("zh-CN");
    expect(second.language).toBe("en");
    expect(first.t("desktop.menu.about", { app })).not.toBe(english);
    expect(second.t("wizard.importCount", { count: 1 })).toBe("Import 1 project");
    expect(second.t("wizard.importCount", { count: 3 })).toBe("Import 3 projects");
    expect(first.t("wizard.importCount", { count: 3 })).toContain("3");
    expect(
      usageAccessibilityLabel(first.t, {
        account: "user@example.com",
        remaining: 75,
        resetsIn: "resets in 1h 5m",
      }),
    ).toContain("1小时 5分钟后重置");
  });
});
