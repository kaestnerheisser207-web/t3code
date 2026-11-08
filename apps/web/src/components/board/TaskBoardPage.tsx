import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { scopeThreadRef, scopedThreadKey } from "@t3tools/client-runtime/environment";
import { pickableProjectGroups } from "@t3tools/client-runtime/state/project-grouping";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import { AuthOrchestrationOperateScope, type EnvironmentId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import * as Schema from "effect/Schema";
import { BotIcon, GitBranchIcon, Rows3Icon } from "lucide-react";
import { memo, useState } from "react";

import type { TranslationKey } from "@t3tools/client-runtime/i18n";

import { isElectron } from "../../env";
import { useTranslate } from "../../i18n";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useSidebarProjectGroups } from "../../hooks/useSidebarProjectGroups";
import { useThreadActions } from "../../hooks/useThreadActions";
import { cn } from "../../lib/utils";
import { useConnectedEnvironmentIds, useEnvironmentIdentities } from "../../state/environments";
import {
  useDelegatedUnderParent,
  useQuietThreadShells,
  useServerConfigs,
} from "../../state/entities";
import {
  olderSettledScopes,
  useOlderSettledShelf,
  useOlderSettledShelfGrowth,
} from "../../state/olderSettledShelf";
import { readEnvironmentScope } from "../../state/session";
import { buildThreadRouteParams } from "../../threadRoutes";
import { RelativeTime } from "../RelativeTime";
import {
  resolveThreadStatusPill,
  type ThreadStatusPill,
  useSnoozeWakeClock,
} from "../Sidebar.logic";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SidebarInset } from "../ui/sidebar";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Toggle } from "../ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import {
  BOARD_COLUMNS,
  OTHER_PROJECTS_LANE,
  type BoardColumnId,
  type BoardDropAction,
  type BoardLane,
  type BoardSubagentCount,
  boardDropTargets,
  buildTaskBoard,
  resolveBoardDrop,
  splitBoardIntoProjectLanes,
} from "./taskBoard.logic";

const PROJECT_KEY_STORAGE = "t3code:board:project";
const GROUP_BY_PROJECT_STORAGE = "t3code:board:group-by-project";
const ALL_PROJECTS = "all";
const SETTLED_PAGE = 30;

const DROP_FAILURE_TITLE = {
  settle: "menuFeedback.settleFailed",
  unsettle: "sidebar.extra.unsettleFailed",
  wake: "menuFeedback.wakeFailed",
} as const satisfies Record<BoardDropAction, TranslationKey>;

const STATUS_LABEL = {
  "Pending Approval": "board.status.pending-approval",
  "Awaiting Input": "board.status.awaiting-input",
  "Guest Request": "board.status.guest-request",
  Working: "board.status.working",
  Connecting: "board.status.connecting",
  Waiting: "board.status.waiting",
  Failed: "board.status.failed",
  "Plan Ready": "board.status.plan-ready",
  Completed: "board.status.completed",
} as const satisfies Record<ThreadStatusPill["label"], TranslationKey>;

const threadKeyOf = (thread: Pick<EnvironmentThreadShell, "environmentId" | "id">) =>
  scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id));

interface DragData {
  readonly threadKey: string;
  readonly column: BoardColumnId;
}

export function TaskBoardPage() {
  const t = useTranslate();
  const navigate = useNavigate();
  const threads = useQuietThreadShells();
  const delegatedUnderParent = useDelegatedUnderParent();
  const serverConfigs = useServerConfigs();
  const connectedEnvironmentIds = useConnectedEnvironmentIds();
  const environments = useEnvironmentIdentities();
  const projectGroups = useSidebarProjectGroups();
  const snoozeWakeClock = useSnoozeWakeClock(threads);
  const { settleThread, unsettleThread, unsnoozeThread } = useThreadActions();
  const [projectKey, setProjectKey] = useLocalStorage(
    PROJECT_KEY_STORAGE,
    ALL_PROJECTS,
    Schema.String,
  );
  const [groupByProject, setGroupByProject] = useLocalStorage(
    GROUP_BY_PROJECT_STORAGE,
    false,
    Schema.Boolean,
  );
  const [pendingMoves, setPendingMoves] = useState<ReadonlyMap<string, BoardColumnId>>(
    () => new Map(),
  );
  const [dragging, setDragging] = useState<DragData | null>(null);
  const [settledLimit, setSettledLimit] = useState(SETTLED_PAGE);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const pickable = pickableProjectGroups(projectGroups);
  const selectedGroup = pickable.find((group) => group.projectKey === projectKey) ?? null;
  const scopedProjectKeys =
    selectedGroup === null
      ? null
      : new Set(
          selectedGroup.memberProjects.map((project) => `${project.environmentId}:${project.id}`),
        );
  const fullBoard = buildTaskBoard({
    threads,
    delegatedUnderParent,
    scopedProjectKeys,
    isConfigLoaded: (environmentId) => serverConfigs.has(environmentId),
    now: new Date(snoozeWakeClock).toISOString(),
    pendingMoves,
  });
  // Shells leave older settled threads out; this reads them in pages, as the sidebar shelf does.
  const olderSettled = useOlderSettledShelf({
    scopes: olderSettledScopes([...serverConfigs.keys()], scopedProjectKeys),
    expanded: true,
    visibleCount: settledLimit,
  });
  const board = {
    ...fullBoard,
    columns: {
      ...fullBoard.columns,
      settled: fullBoard.columns.settled.filter(olderSettled.isListed),
    },
  };
  useOlderSettledShelfGrowth(olderSettled, board.columns.settled);
  const unloadedSettledCount = olderSettled.unloadedCount(
    BOARD_COLUMNS.flatMap(({ id }) => fullBoard.columns[id]),
  );
  const lanes: ReadonlyArray<BoardLane> =
    groupByProject && selectedGroup === null
      ? splitBoardIntoProjectLanes(board, projectGroups)
      : [{ key: "all", title: "", columns: board.columns }];

  const projectNameByKey = new Map(
    projectGroups.flatMap((group) =>
      group.memberProjects.map(
        (project) => [`${project.environmentId}:${project.id}`, group.displayName] as const,
      ),
    ),
  );
  const environmentLabelById = new Map(
    environments.map((environment) => [environment.environmentId, environment.label] as const),
  );
  const showEnvironment = environments.length > 1;
  const showProject = selectedGroup === null && !groupByProject;
  const connected = new Set(connectedEnvironmentIds);
  const canDrag = (environmentId: EnvironmentId) =>
    connected.has(environmentId) &&
    serverConfigs.has(environmentId) &&
    readEnvironmentScope(environmentId, AuthOrchestrationOperateScope);
  const threadByKey = new Map(threads.map((thread) => [threadKeyOf(thread), thread] as const));
  const dropTargets = dragging === null ? null : boardDropTargets(dragging.column);

  const runDrop = async (thread: EnvironmentThreadShell, action: BoardDropAction) => {
    const ref = scopeThreadRef(thread.environmentId, thread.id);
    const result =
      action === "settle"
        ? await settleThread(ref)
        : action === "unsettle"
          ? await unsettleThread(ref)
          : await unsnoozeThread(ref);
    setPendingMoves((current) => {
      const next = new Map(current);
      next.delete(threadKeyOf(thread));
      return next;
    });
    if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
      const error = squashAtomCommandFailure(result);
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: t(DROP_FAILURE_TITLE[action]),
          description: error instanceof Error ? error.message : t("menuFeedback.error"),
        }),
      );
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    setDragging((event.active.data.current as DragData | undefined) ?? null);
  };
  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const data = event.active.data.current as DragData | undefined;
    const target = event.over?.data.current as { column: BoardColumnId } | undefined;
    if (!data || !target) return;
    const action = resolveBoardDrop(data.column, target.column);
    const thread = threadByKey.get(data.threadKey);
    if (action === null || thread === undefined) return;
    setPendingMoves((current) => new Map(current).set(data.threadKey, target.column));
    void runDrop(thread, action);
  };

  const openThread = (thread: EnvironmentThreadShell) => {
    void navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(scopeThreadRef(thread.environmentId, thread.id)),
    });
  };

  const cardProps = (thread: EnvironmentThreadShell, column: BoardColumnId) => {
    const key = threadKeyOf(thread);
    return {
      thread,
      column,
      threadKey: key,
      projectName: showProject
        ? (projectNameByKey.get(`${thread.environmentId}:${thread.projectId}`) ?? null)
        : null,
      environmentLabel: showEnvironment
        ? (environmentLabelById.get(thread.environmentId) ?? null)
        : null,
      offline: !connected.has(thread.environmentId),
      draggable: canDrag(thread.environmentId),
      subagents: board.subagentsByThreadKey.get(key) ?? null,
      onOpen: openThread,
    };
  };

  const draggedThread = dragging === null ? undefined : threadByKey.get(dragging.threadKey);
  const totalCards = BOARD_COLUMNS.reduce((sum, { id }) => sum + board.columns[id].length, 0);

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <WorkspacePageHeader electron={isElectron} className="border-b border-border">
          <h1 className="truncate text-sm font-medium">{t("board.title")}</h1>
          <div className="ml-auto flex items-center gap-2 [-webkit-app-region:no-drag]">
            <Select
              value={selectedGroup?.projectKey ?? ALL_PROJECTS}
              onValueChange={(value) => {
                if (value !== null) setProjectKey(value);
              }}
            >
              <SelectTrigger aria-label={t("board.filter-by-project")} className="w-44" size="sm">
                <SelectValue>{selectedGroup?.displayName ?? t("board.all-projects")}</SelectValue>
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value={ALL_PROJECTS}>{t("board.all-projects")}</SelectItem>
                {pickable.map((group) => (
                  <SelectItem key={group.projectKey} value={group.projectKey}>
                    {group.displayName}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Toggle
                    aria-label={t("board.group-by-project")}
                    size="sm"
                    variant="ghost"
                    disabled={selectedGroup !== null}
                    pressed={groupByProject && selectedGroup === null}
                    onPressedChange={setGroupByProject}
                  >
                    <Rows3Icon />
                  </Toggle>
                }
              />
              <TooltipPopup side="bottom">{t("board.group-by-project")}</TooltipPopup>
            </Tooltip>
          </div>
        </WorkspacePageHeader>

        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragging(null)}
        >
          <div className="min-h-0 flex-1 overflow-auto">
            {totalCards === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                {t("board.empty")}
              </p>
            ) : (
              <div className="flex w-fit min-w-full flex-col gap-6 p-4">
                {lanes.map((lane) => {
                  const laneTitle =
                    lane.key === OTHER_PROJECTS_LANE ? t("board.other-projects") : lane.title;
                  return (
                    <section key={lane.key} aria-label={laneTitle || undefined}>
                      {laneTitle ? (
                        <h2 className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                          {laneTitle}
                        </h2>
                      ) : null}
                      <div className="grid grid-cols-[repeat(5,minmax(11rem,1fr))] gap-3">
                        {BOARD_COLUMNS.map(({ id }) => {
                          const cards = lane.columns[id];
                          const visible = id === "settled" ? cards.slice(0, settledLimit) : cards;
                          // Lanes cannot attribute unloaded older threads to a project.
                          const unloaded =
                            id === "settled" && lane.key === "all" ? unloadedSettledCount : 0;
                          return (
                            <BoardColumn
                              key={id}
                              droppableId={`${lane.key}|${id}`}
                              column={id}
                              title={t(`board.column.${id}`)}
                              count={cards.length + unloaded}
                              dropState={
                                dropTargets === null
                                  ? "idle"
                                  : dropTargets.has(id)
                                    ? "accepts"
                                    : "rejects"
                              }
                            >
                              {visible.map((thread) => (
                                <BoardCard key={threadKeyOf(thread)} {...cardProps(thread, id)} />
                              ))}
                              {visible.length < cards.length || unloaded > 0 ? (
                                <Button
                                  size="xs"
                                  variant="ghost-muted"
                                  disabled={olderSettled.loading}
                                  onClick={() => setSettledLimit((limit) => limit + SETTLED_PAGE)}
                                >
                                  {olderSettled.loading ? t("board.loading") : t("board.show-more")}
                                </Button>
                              ) : null}
                            </BoardColumn>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
          <DragOverlay dropAnimation={null}>
            {draggedThread && dragging ? (
              <BoardCardOverlay {...cardProps(draggedThread, dragging.column)} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </SidebarInset>
  );
}

function BoardColumn(props: {
  droppableId: string;
  column: BoardColumnId;
  title: string;
  count: number;
  dropState: "idle" | "accepts" | "rejects";
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: props.droppableId,
    data: { column: props.column },
    disabled: props.dropState === "rejects",
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-24 flex-col gap-2 rounded-lg bg-muted/40 p-2",
        props.dropState === "accepts" && "ring-1 ring-border",
        props.dropState === "accepts" && isOver && "ring-primary",
        props.dropState === "rejects" && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
        <span>{props.title}</span>
        <span className="tabular-nums">{props.count}</span>
      </div>
      {props.children}
    </div>
  );
}

interface BoardCardProps {
  readonly thread: EnvironmentThreadShell;
  readonly column: BoardColumnId;
  readonly threadKey: string;
  readonly projectName: string | null;
  readonly environmentLabel: string | null;
  readonly offline: boolean;
  readonly draggable: boolean;
  readonly subagents: BoardSubagentCount | null;
  readonly onOpen: (thread: EnvironmentThreadShell) => void;
}

const CARD_CLASS =
  "flex w-full flex-col gap-1.5 rounded-md border border-border bg-card p-2.5 text-left text-card-foreground outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

const BoardCard = memo(function BoardCard(props: BoardCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.threadKey,
    data: { threadKey: props.threadKey, column: props.column } satisfies DragData,
    disabled: !props.draggable,
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => props.onOpen(props.thread)}
      className={cn(CARD_CLASS, props.offline && "opacity-60", isDragging && "opacity-40")}
    >
      <BoardCardContent {...props} />
    </button>
  );
});

function BoardCardOverlay(props: BoardCardProps) {
  return (
    <div className={cn(CARD_CLASS, "w-60 shadow-lg")}>
      <BoardCardContent {...props} />
    </div>
  );
}

function BoardCardContent(props: BoardCardProps) {
  const t = useTranslate();
  const { thread } = props;
  const status = resolveThreadStatusPill({ thread });
  const snippet = thread.source.latestVisibleMessage?.text.trim() ?? "";
  const meta = [props.projectName, props.environmentLabel].filter(Boolean).join(" · ");
  return (
    <>
      <span className="line-clamp-2 text-sm font-medium">{thread.title}</span>
      {thread.goal ? (
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {t("board.goal", { objective: thread.goal.objective })}
        </span>
      ) : snippet ? (
        <span className="line-clamp-2 text-xs text-muted-foreground">{snippet}</span>
      ) : null}
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
        {status ? (
          <span className={cn("flex items-center gap-1", status.colorClass)}>
            <span aria-hidden className={cn("size-1.5 rounded-full", status.dotClass)} />
            {t(STATUS_LABEL[status.label])}
          </span>
        ) : null}
        {props.subagents ? (
          <span className="flex items-center gap-1">
            <BotIcon aria-hidden className="size-3" />
            {props.subagents.working > 0
              ? t("board.subagents-running", {
                  working: props.subagents.working,
                  total: props.subagents.total,
                })
              : t("board.subagents", { count: props.subagents.total })}
          </span>
        ) : null}
        {thread.branch ? (
          <span className="flex min-w-0 items-center gap-1">
            <GitBranchIcon aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{thread.branch}</span>
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground">
        {meta ? <span className="min-w-0 truncate">{meta}</span> : null}
        {props.offline ? <span>{t("board.offline")}</span> : null}
        <span className="ml-auto shrink-0">
          {props.column === "snoozed" && thread.snoozedUntil ? (
            <>
              {t("board.wakes")} <RelativeTime timestamp={thread.snoozedUntil} />
            </>
          ) : (
            <RelativeTime
              timestamp={
                props.column === "settled" && thread.settledAt
                  ? thread.settledAt
                  : (thread.latestUserMessageAt ?? thread.updatedAt)
              }
            />
          )}
        </span>
      </span>
    </>
  );
}
