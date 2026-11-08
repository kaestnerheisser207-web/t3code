import { scopeThreadRef, scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import { isThreadWorking } from "@t3tools/client-runtime/state/thread-inbox";
import { effectiveSnoozed } from "@t3tools/client-runtime/state/thread-settled";
import { sortSettledThreads } from "@t3tools/client-runtime/state/thread-sort";
import { isListedThreadLineage, type EnvironmentId } from "@t3tools/contracts";

import { filterSidebarV2VisibleThreads, resolveSidebarThreadStatus } from "../Sidebar.logic";

export type BoardColumnId = "needs-you" | "working" | "ready" | "snoozed" | "settled";

export const BOARD_COLUMNS: ReadonlyArray<{ readonly id: BoardColumnId }> = [
  { id: "needs-you" },
  { id: "working" },
  { id: "ready" },
  { id: "snoozed" },
  { id: "settled" },
];

/** The lane for threads whose project no group lists. */
export const OTHER_PROJECTS_LANE = "\0other";

export type BoardDropAction = "settle" | "unsettle" | "wake";

export interface BoardSubagentCount {
  readonly total: number;
  readonly working: number;
}

export interface TaskBoard {
  readonly columns: Readonly<Record<BoardColumnId, ReadonlyArray<EnvironmentThreadShell>>>;
  readonly subagentsByThreadKey: ReadonlyMap<string, BoardSubagentCount>;
}

const boardThreadKey = (thread: Pick<EnvironmentThreadShell, "environmentId" | "id">) =>
  scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id));

/**
 * Snooze and settle are the user's own choices, so they place a card before
 * the agent's state does, as the sidebar sections do. An unloaded server
 * config means those fields cannot be trusted yet.
 */
export function resolveBoardColumn(
  thread: EnvironmentThreadShell,
  input: { readonly now: string; readonly configLoaded: boolean },
): BoardColumnId {
  if (input.configLoaded && effectiveSnoozed(thread, { now: input.now })) return "snoozed";
  if (input.configLoaded && thread.settledOverride === "settled") return "settled";
  switch (resolveSidebarThreadStatus(thread)) {
    case "approval":
    case "input":
    case "request":
    case "failed":
    case "limited":
      return "needs-you";
    case "preparing":
    case "working":
    case "waiting":
      return "working";
    case "ready":
      return thread.interactionMode === "plan" && thread.hasActionableProposedPlan
        ? "needs-you"
        : "ready";
  }
}

/** Only the user-owned columns accept drops; snoozing needs a wake time. */
export function resolveBoardDrop(from: BoardColumnId, to: BoardColumnId): BoardDropAction | null {
  if (from === to) return null;
  if (to === "settled") return "settle";
  if (to === "ready") {
    if (from === "settled") return "unsettle";
    if (from === "snoozed") return "wake";
  }
  return null;
}

export function boardDropTargets(from: BoardColumnId): ReadonlySet<BoardColumnId> {
  return new Set(BOARD_COLUMNS.flatMap(({ id }) => (resolveBoardDrop(from, id) ? [id] : [])));
}

const byRecentActivity = (left: EnvironmentThreadShell, right: EnvironmentThreadShell) =>
  Date.parse(right.latestUserMessageAt ?? right.updatedAt) -
  Date.parse(left.latestUserMessageAt ?? left.updatedAt);

/**
 * Subagents roll up into the nearest listed ancestor in their own environment,
 * so a chain of subagents counts on the card the user sees.
 */
function countSubagents(
  threads: ReadonlyArray<EnvironmentThreadShell>,
): ReadonlyMap<string, BoardSubagentCount> {
  const byKey = new Map(threads.map((thread) => [boardThreadKey(thread), thread] as const));
  const counts = new Map<string, { total: number; working: number }>();
  for (const thread of threads) {
    if (thread.archivedAt !== null || thread.lineage.relationshipToParent !== "subagent") continue;
    const visited = new Set<string>();
    let parent = ancestorOf(thread, byKey);
    while (parent !== undefined && !isListedThreadLineage(parent.lineage)) {
      const key = boardThreadKey(parent);
      if (visited.has(key)) break;
      visited.add(key);
      parent = ancestorOf(parent, byKey);
    }
    if (parent === undefined || !isListedThreadLineage(parent.lineage)) continue;
    const key = boardThreadKey(parent);
    const count = counts.get(key) ?? { total: 0, working: 0 };
    count.total += 1;
    if (isThreadWorking(thread)) count.working += 1;
    counts.set(key, count);
  }
  return counts;
}

function ancestorOf(
  thread: EnvironmentThreadShell,
  byKey: ReadonlyMap<string, EnvironmentThreadShell>,
): EnvironmentThreadShell | undefined {
  const parentId = thread.lineage.parentThreadId;
  if (parentId === null) return undefined;
  return byKey.get(boardThreadKey({ environmentId: thread.environmentId, id: parentId }));
}

export function buildTaskBoard(input: {
  readonly threads: ReadonlyArray<EnvironmentThreadShell>;
  readonly delegatedUnderParent: ReadonlySet<string>;
  /** `${environmentId}:${projectId}` keys to keep, or null for every project. */
  readonly scopedProjectKeys: ReadonlySet<string> | null;
  readonly isConfigLoaded: (environmentId: EnvironmentId) => boolean;
  readonly now: string;
  /** Columns the user just dropped cards into, until the server confirms. */
  readonly pendingMoves?: ReadonlyMap<string, BoardColumnId>;
}): TaskBoard {
  const columns: Record<BoardColumnId, EnvironmentThreadShell[]> = {
    "needs-you": [],
    working: [],
    ready: [],
    snoozed: [],
    settled: [],
  };
  const visible = filterSidebarV2VisibleThreads(
    input.threads,
    input.scopedProjectKeys,
    input.delegatedUnderParent,
  );
  for (const thread of visible) {
    const column =
      input.pendingMoves?.get(boardThreadKey(thread)) ??
      resolveBoardColumn(thread, {
        now: input.now,
        configLoaded: input.isConfigLoaded(thread.environmentId),
      });
    columns[column].push(thread);
  }
  columns["needs-you"].sort(byRecentActivity);
  columns.working.sort(byRecentActivity);
  columns.ready.sort(byRecentActivity);
  columns.snoozed.sort(
    (left, right) => Date.parse(left.snoozedUntil ?? "") - Date.parse(right.snoozedUntil ?? ""),
  );
  return {
    columns: { ...columns, settled: sortSettledThreads(columns.settled) },
    subagentsByThreadKey: countSubagents(input.threads),
  };
}

export interface BoardProjectGroup {
  readonly projectKey: string;
  readonly displayName: string;
  readonly memberProjects: ReadonlyArray<{
    readonly environmentId: EnvironmentId;
    readonly id: string;
  }>;
}

export interface BoardLane {
  readonly key: string;
  readonly title: string;
  readonly columns: Readonly<Record<BoardColumnId, ReadonlyArray<EnvironmentThreadShell>>>;
}

/** Splits a board into one lane per project group, in the groups' order; empty lanes drop out. */
export function splitBoardIntoProjectLanes(
  board: TaskBoard,
  groups: ReadonlyArray<BoardProjectGroup>,
): ReadonlyArray<BoardLane> {
  const groupKeyByProject = new Map(
    groups.flatMap((group) =>
      group.memberProjects.map(
        (project) => [`${project.environmentId}:${project.id}`, group.projectKey] as const,
      ),
    ),
  );
  const lanes = new Map<string, Record<BoardColumnId, EnvironmentThreadShell[]>>();
  for (const { id: columnId } of BOARD_COLUMNS) {
    for (const thread of board.columns[columnId]) {
      const laneKey =
        groupKeyByProject.get(`${thread.environmentId}:${thread.projectId}`) ?? OTHER_PROJECTS_LANE;
      let lane = lanes.get(laneKey);
      if (lane === undefined) {
        lane = { "needs-you": [], working: [], ready: [], snoozed: [], settled: [] };
        lanes.set(laneKey, lane);
      }
      lane[columnId].push(thread);
    }
  }
  const ordered: BoardLane[] = groups.flatMap((group) => {
    const columns = lanes.get(group.projectKey);
    return columns ? [{ key: group.projectKey, title: group.displayName, columns }] : [];
  });
  const other = lanes.get(OTHER_PROJECTS_LANE);
  if (other) ordered.push({ key: OTHER_PROJECTS_LANE, title: "", columns: other });
  return ordered;
}
