import type { ClientSettings } from "@t3tools/contracts";

// Ids are stored in client settings, so never rename one.
export const THREAD_DETAILS_ITEMS = [
  {
    id: "environment",
    label: "Environment and worktree",
    labelKey: "release3904.environment-and-worktree",
    defaultVisible: true,
  },
  {
    id: "openIn",
    label: "Open in editor",
    labelKey: "release3904.open-in-editor",
    defaultVisible: true,
  },
  {
    id: "scripts",
    label: "Project scripts",
    labelKey: "release3904.project-scripts",
    defaultVisible: true,
  },
  {
    id: "branch",
    label: "Branch and pull request",
    labelKey: "release3904.branch-and-pull-request",
    defaultVisible: true,
  },
  {
    id: "gitActions",
    label: "Git actions",
    labelKey: "release3904.git-actions",
    defaultVisible: true,
  },
  {
    id: "changes",
    label: "Changes",
    labelKey: "release3904.details-changes",
    defaultVisible: true,
  },
  {
    id: "servers",
    label: "Servers",
    labelKey: "release3904.details-servers",
    defaultVisible: true,
  },
  {
    id: "automations",
    label: "Automations",
    labelKey: "release3904.details-automations",
    defaultVisible: true,
  },
  {
    id: "lineage",
    label: "Lineage",
    labelKey: "release3904.details-lineage",
    defaultVisible: true,
  },
  { id: "sideChats", label: "Side chats", labelKey: "release016.side-chats", defaultVisible: true },
  { id: "usage", label: "Usage limits", labelKey: "release016.limits", defaultVisible: false },
  { id: "context", label: "Context window", labelKey: "release016.context", defaultVisible: false },
] as const;

export type ThreadDetailsItemId = (typeof THREAD_DETAILS_ITEMS)[number]["id"];
export type ThreadDetailsVisibility = Readonly<Record<ThreadDetailsItemId, boolean>>;

type ThreadDetailsItem = (typeof THREAD_DETAILS_ITEMS)[number];
type ThreadDetailsItemSettings = Pick<
  ClientSettings,
  "threadDetailsItems" | "threadDetailsUsageEnabled"
>;

// People who turned on the retired Labs toggle keep Usage and Context until they change them here.
function defaultVisible(item: ThreadDetailsItem, settings: ThreadDetailsItemSettings) {
  return item.id === "usage" || item.id === "context"
    ? settings.threadDetailsUsageEnabled
    : item.defaultVisible;
}

export function resolveThreadDetailsVisibility(
  settings: ThreadDetailsItemSettings,
): ThreadDetailsVisibility {
  return Object.fromEntries(
    THREAD_DETAILS_ITEMS.map((item) => [
      item.id,
      settings.threadDetailsItems[item.id] ?? defaultVisible(item, settings),
    ]),
  ) as Record<ThreadDetailsItemId, boolean>;
}

/** Stores only choices that differ from the default, so a later default change reaches everyone else. */
export function setThreadDetailsItem(
  settings: ThreadDetailsItemSettings,
  item: ThreadDetailsItem,
  visible: boolean,
): ClientSettings["threadDetailsItems"] {
  const { [item.id]: _previous, ...rest } = settings.threadDetailsItems;
  return visible === defaultVisible(item, settings) ? rest : { ...rest, [item.id]: visible };
}

export function isDefaultThreadDetailsVisibility(visibility: ThreadDetailsVisibility) {
  return THREAD_DETAILS_ITEMS.every((item) => visibility[item.id] === item.defaultVisible);
}

/** Also clears the retired Labs flag, so Usage and Context return to off. */
export const RESET_THREAD_DETAILS_ITEMS = {
  threadDetailsItems: {},
  threadDetailsUsageEnabled: false,
} satisfies Partial<ClientSettings>;
