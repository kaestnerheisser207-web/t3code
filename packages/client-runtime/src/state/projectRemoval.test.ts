import { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { expect, it } from "@effect/vitest";
import { createI18n } from "../i18n/index.ts";
import { planProjectRemoval } from "./projectRemoval.ts";

it("keeps removal scope and unloaded thread counts when the confirmation is localized", () => {
  const environmentId = EnvironmentId.make("local");
  const projectId = ProjectId.make("shared-id");
  const selected = { environmentId, projectId };
  const options = {
    members: [
      {
        environmentId,
        id: projectId,
        title: "demo {{raw}}",
        workspaceRoot: "/work/demo",
        environmentLabel: "Mac",
      },
    ],
    groupMemberCount: 2,
    hasOtherMembers: true,
    displayName: "demo",
    threads: [selected, { environmentId: EnvironmentId.make("remote"), projectId }],
    unloadedThreadCount: 3,
  };
  const english = planProjectRemoval(options);
  const chinese = planProjectRemoval(options, createI18n("zh-CN").t);
  expect(chinese.projectThreads).toEqual([selected]);
  expect(chinese.projectThreads).toEqual(english.projectThreads);
  expect(chinese.targetKind).toBe("checkout");
  expect(chinese.isWholeGroup).toBe(false);
  expect(chinese.confirmationMessage).toContain("4 个会话");
  expect(chinese.confirmationMessage).toContain("demo {{raw}}");
  expect(chinese.confirmationMessage).toContain("/work/demo");
  expect(chinese.confirmationMessage).toContain("其他条目不受影响");
  const whole = planProjectRemoval(
    { ...options, groupMemberCount: 1, hasOtherMembers: false },
    createI18n("zh-CN").t,
  );
  expect(whole.targetKind).toBe("project");
  expect(whole.isWholeGroup).toBe(true);
  expect(whole.confirmationMessage).toContain("不会删除磁盘上的文件");
});
