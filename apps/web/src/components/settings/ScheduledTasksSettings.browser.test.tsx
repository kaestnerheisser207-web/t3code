import { minuteTick } from "@t3tools/client-runtime/clock";
import { createI18n } from "@t3tools/client-runtime/i18n";
import { I18nextProvider } from "react-i18next";
import {
  DEFAULT_UNIFIED_SETTINGS,
  EnvironmentId,
  ProjectId,
  ProviderInstanceId,
  ScheduledTaskId,
  type ScheduledTask,
} from "@t3tools/contracts";
import { describe, expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import "~/index.css";
import { render } from "../../../test/render";
import { ScheduledRelativeLabel, ScheduledTasksSettings } from "./ScheduledTasksSettings";

const environmentId = EnvironmentId.make("laptop");
const projectId = ProjectId.make("project");
const task: ScheduledTask = {
  id: ScheduledTaskId.make("nightly"),
  title: "Review issues",
  prompt: "Review open issues",
  enabled: true,
  schedule: { type: "interval", everyMs: 60_000 },
  projectId,
  threadId: null,
  workspaceStrategy: { type: "root" },
  modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5.4" },
  runtimeMode: "full-access",
  interactionMode: "default",
  createdBy: "user",
  creationSource: "web",
  createdAt: "2026-09-17T00:00:00.000Z",
  updatedAt: "2026-09-17T00:00:00.000Z",
  nextRunAt: null,
  lastRunAt: null,
  lastRunStatus: "never",
  lastRunError: null,
  runCount: 0,
};

const state = vi.hoisted(() => ({ connected: true, tasksLoaded: true }));

function environment() {
  return {
    environmentId,
    label: "Laptop",
    connection: { phase: state.connected ? "connected" : "disconnected" },
    serverConfig: state.connected ? { environment: { platform: "linux" } } : null,
  };
}

vi.mock(import("./SettingsScopeContext"), async (original) => {
  const scope = () => {
    const entry = environment();
    return {
      scope: { kind: "all", label: "All", members: [], environmentIds: [environmentId] },
      environments: [entry],
      connectedEnvironments: state.connected ? [entry] : [],
      environment: entry,
      target: null,
      targets: [],
    };
  };
  return {
    ...(await original()),
    useSettingsScope: scope as never,
  };
});
vi.mock(import("../../state/server"), async (original) => {
  const actual = await original();
  const { Atom } = await import("effect/reactivity");
  const allowed = Atom.make(true);
  return {
    ...actual,
    serverEnvironment: {
      ...actual.serverEnvironment,
      upsertScheduledTask: {
        ...actual.serverEnvironment.upsertScheduledTask,
        permissionAtom: () => allowed,
      },
    },
  };
});
// Mirrors the real query: a null request (disconnected environment) has no data.
vi.mock(import("../../state/query"), async (original) => ({
  ...(await original()),
  useEnvironmentQuery: ((request: unknown) => ({
    data: request === null ? null : { tasks: state.tasksLoaded ? [task] : [] },
    error: null,
    isPending: false,
    refresh: vi.fn(),
  })) as never,
}));
vi.mock(import("../../state/environments"), async (original) => ({
  ...(await original()),
  useEnvironment: (() => environment()) as never,
}));
vi.mock(import("../../state/entities"), async (original) => ({
  ...(await original()),
  useProjects: (() => [{ id: projectId, environmentId, title: "Project" }]) as never,
}));
vi.mock(import("../../hooks/useSettings"), async (original) => ({
  ...(await original()),
  useEnvironmentSettings: (() => DEFAULT_UNIFIED_SETTINGS) as never,
}));

describe("ScheduledTasksSettings", () => {
  it("keeps a linked task's unsaved edits across a disconnect and reconnect", async () => {
    state.connected = true;
    state.tasksLoaded = true;
    await using screen = await render(<ScheduledTasksSettings taskId={task.id} />);
    const name = page.getByRole("dialog").getByRole("textbox", { name: "Name" });
    await expect.element(name).toHaveValue("Review issues");
    await userEvent.fill(name, "Review stale issues");

    state.connected = false;
    await screen.rerender(<ScheduledTasksSettings taskId={task.id} />);

    await expect.element(name).toHaveValue("Review stale issues");

    state.connected = true;
    await screen.rerender(<ScheduledTasksSettings taskId={task.id} />);
    await expect.element(name).toHaveValue("Review stale issues");
  });

  it("keeps an editor the user opened when the linked task loads later", async () => {
    state.connected = true;
    state.tasksLoaded = false;
    await using screen = await render(<ScheduledTasksSettings taskId={task.id} />);
    await userEvent.click(page.getByRole("button", { name: "New task" }));
    const dialog = page.getByRole("dialog");
    const name = dialog.getByRole("textbox", { name: "Name" });
    await userEvent.fill(name, "My draft");

    state.tasksLoaded = true;
    await screen.rerender(<ScheduledTasksSettings taskId={task.id} />);

    await expect.element(dialog.getByRole("heading", { name: "New task" })).toBeInTheDocument();
    await expect.element(name).toHaveValue("My draft");
  });
});

it("updates upcoming and elapsed run times when the language changes", async () => {
  using _clock = vi.spyOn(minuteTick, "getSnapshot").mockReturnValue("2026-10-29T12:00");
  const i18n = createI18n("en");
  const view = (value: string | null) => (
    <I18nextProvider i18n={i18n}>
      <span>
        <ScheduledRelativeLabel value={value} />
      </span>
    </I18nextProvider>
  );
  await using screen = await render(view("2026-10-29T12:01:30Z"));
  await expect.element(screen.getByText("in 2m", { exact: true })).toBeVisible();
  await i18n.changeLanguage("zh-CN");
  await expect.element(screen.getByText("2分钟后", { exact: true })).toBeVisible();
  await screen.rerender(view("2026-10-29T11:59:00Z"));
  await expect.element(screen.getByText("1 分钟前", { exact: true })).toBeVisible();
  await screen.rerender(view("invalid"));
  await expect.element(screen.getByText("未安排", { exact: true })).toBeVisible();
  await screen.rerender(view(null));
  await expect.element(screen.getByText("未安排", { exact: true })).toBeVisible();
});
