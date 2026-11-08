import { EnvironmentId, ProjectId, ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { makeThreadFixture, type ThreadFixtureOverrides } from "../../test-fixtures";
import {
  type BoardColumnId,
  buildTaskBoard,
  OTHER_PROJECTS_LANE,
  resolveBoardColumn,
  resolveBoardDrop,
  splitBoardIntoProjectLanes,
} from "./taskBoard.logic";

const environmentId = EnvironmentId.make("environment-board");
const NOW = "2026-03-09T12:00:00.000Z";

const runtime = (status: "preparing" | "running" | "failed" | "completed") => ({
  status,
  activeRunId: null,
  providerInstanceId: ProviderInstanceId.make("codex"),
  providerName: null,
  lastError: status === "failed" ? "boom" : null,
  updatedAt: NOW,
});

const thread = (id: string, overrides: ThreadFixtureOverrides = {}) =>
  makeThreadFixture({ id: ThreadId.make(id), environmentId, ...overrides });

const subagentOf = (id: string, parentId: string) =>
  thread(id, {
    lineage: {
      rootThreadId: ThreadId.make(parentId),
      parentThreadId: ThreadId.make(parentId),
      relationshipToParent: "subagent",
    },
  });

const columnIds = (board: ReturnType<typeof buildTaskBoard>, column: BoardColumnId) =>
  board.columns[column].map((entry) => entry.id as string);

describe("resolveBoardColumn", () => {
  it.each([
    ["approval", { hasPendingApprovals: true }, "needs-you"],
    ["user input", { hasPendingUserInput: true }, "needs-you"],
    ["failed run", { runtime: runtime("failed") }, "needs-you"],
    [
      "actionable plan",
      { interactionMode: "plan", hasActionableProposedPlan: true, runtime: runtime("completed") },
      "needs-you",
    ],
    ["preparing", { runtime: runtime("preparing") }, "working"],
    ["running", { runtime: runtime("running") }, "working"],
    ["finished", { runtime: runtime("completed") }, "ready"],
    [
      "settled while it needs you",
      { settledOverride: "settled", hasPendingApprovals: true },
      "settled",
    ],
    [
      "snoozed while settled",
      { settledOverride: "settled", snoozedUntil: "2026-03-10T00:00:00.000Z" },
      "snoozed",
    ],
    ["woken snooze", { snoozedUntil: "2026-03-09T11:00:00.000Z" }, "ready"],
  ] as const)("places a %s thread", (_name, overrides, expected) => {
    expect(
      resolveBoardColumn(thread("thread", overrides as ThreadFixtureOverrides), {
        now: NOW,
        configLoaded: true,
      }),
    ).toBe(expected);
  });

  it("ignores settle and snooze until the server config loads", () => {
    const settled = thread("thread", { settledOverride: "settled" });
    expect(resolveBoardColumn(settled, { now: NOW, configLoaded: false })).toBe("ready");
  });
});

describe("resolveBoardDrop", () => {
  it.each([
    ["ready", "settled", "settle"],
    ["needs-you", "settled", "settle"],
    ["snoozed", "settled", "settle"],
    ["settled", "ready", "unsettle"],
    ["snoozed", "ready", "wake"],
    ["ready", "snoozed", null],
    ["ready", "working", null],
    ["settled", "needs-you", null],
    ["working", "ready", null],
    ["settled", "settled", null],
  ] as const)("maps %s -> %s to %s", (from, to, expected) => {
    expect(resolveBoardDrop(from, to)).toBe(expected);
  });
});

describe("buildTaskBoard", () => {
  it("lists subagents only as counts on their nearest listed ancestor", () => {
    const board = buildTaskBoard({
      threads: [
        thread("root"),
        subagentOf("child", "root"),
        { ...subagentOf("grandchild", "child"), runtime: runtime("running") },
        subagentOf("orphan", "missing"),
      ],
      delegatedUnderParent: new Set(),
      scopedProjectKeys: null,
      isConfigLoaded: () => true,
      now: NOW,
    });
    expect(columnIds(board, "ready")).toEqual(["root"]);
    expect(columnIds(board, "working")).toEqual([]);
    expect([...board.subagentsByThreadKey.values()]).toEqual([{ total: 2, working: 1 }]);
  });

  it("keeps a dropped card in its target column until the server catches up", () => {
    const ready = thread("ready", { runtime: runtime("completed") });
    const board = buildTaskBoard({
      threads: [ready],
      delegatedUnderParent: new Set(),
      scopedProjectKeys: null,
      isConfigLoaded: () => true,
      now: NOW,
      pendingMoves: new Map([[`${environmentId}:ready`, "settled"]]),
    });
    expect(columnIds(board, "settled")).toEqual(["ready"]);
    expect(columnIds(board, "ready")).toEqual([]);
  });

  it("splits into project lanes in group order, with unknown projects last", () => {
    const projectA = ProjectId.make("project-a");
    const projectB = ProjectId.make("project-b");
    const otherEnvironment = EnvironmentId.make("environment-other");
    const board = buildTaskBoard({
      threads: [
        thread("a-local", { projectId: projectA }),
        makeThreadFixture({
          id: ThreadId.make("a-remote"),
          environmentId: otherEnvironment,
          projectId: projectA,
        }),
        thread("b", { projectId: projectB }),
        thread("loose", { projectId: ProjectId.make("project-unknown") }),
      ],
      delegatedUnderParent: new Set(),
      scopedProjectKeys: null,
      isConfigLoaded: () => true,
      now: NOW,
    });
    const lanes = splitBoardIntoProjectLanes(board, [
      { projectKey: "repo-b", displayName: "B", memberProjects: [{ environmentId, id: projectB }] },
      {
        projectKey: "repo-a",
        displayName: "A",
        memberProjects: [
          { environmentId, id: projectA },
          { environmentId: otherEnvironment, id: projectA },
        ],
      },
    ]);
    expect(lanes.map((lane) => [lane.key, lane.columns.ready.map((entry) => entry.id)])).toEqual([
      ["repo-b", ["b"]],
      ["repo-a", ["a-local", "a-remote"]],
      [OTHER_PROJECTS_LANE, ["loose"]],
    ]);
  });
});
