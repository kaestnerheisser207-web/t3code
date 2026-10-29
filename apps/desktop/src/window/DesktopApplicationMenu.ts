import { desktopI18n } from "../i18n.ts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as Electron from "electron";
import { type createI18n, resolveLanguage } from "@t3tools/client-runtime/i18n";

import { makeComponentLogger } from "../app/DesktopObservability.ts";
import * as ElectronDialog from "../electron/ElectronDialog.ts";
import * as ElectronMenu from "../electron/ElectronMenu.ts";
import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";
import * as DesktopUpdates from "../updates/DesktopUpdates.ts";
import * as DesktopWindow from "./DesktopWindow.ts";
import * as DesktopClientSettings from "../settings/DesktopClientSettings.ts";
import * as ElectronApp from "../electron/ElectronApp.ts";

export class DesktopApplicationMenuActionError extends Schema.TaggedError<DesktopApplicationMenuActionError>()(
  "DesktopApplicationMenuActionError",
  {
    action: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Desktop menu action "${this.action}" failed.`;
  }
}

export class DesktopApplicationMenu extends Context.Service<
  DesktopApplicationMenu,
  {
    readonly configure: Effect.Effect<void>;
  }
>()("@t3tools/desktop/window/DesktopApplicationMenu") {}

type DesktopApplicationMenuRuntimeServices =
  | DesktopUpdates.DesktopUpdates
  | DesktopWindow.DesktopWindow
  | ElectronDialog.ElectronDialog;

const { logInfo: logUpdaterInfo } = makeComponentLogger("desktop-updater");

const { logError: logMenuError } = makeComponentLogger("desktop-menu");

const dispatchMenuAction = Effect.fn("desktop.menu.dispatchMenuAction")(function* (
  action: string,
): Effect.fn.Return<void, DesktopWindow.DesktopWindowError, DesktopWindow.DesktopWindow> {
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.dispatchMenuAction(action, {
    reveal: action !== "paste-as-text",
  });
});

const zoomMainWindow = Effect.fn("desktop.menu.zoomMainWindow")(function* (
  direction: DesktopWindow.MainWindowZoomDirection,
): Effect.fn.Return<void, never, DesktopWindow.DesktopWindow> {
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.zoomMain(direction);
});

const runMainContentsCommand = Effect.fn("desktop.menu.runMainContentsCommand")(function* (
  command: DesktopWindow.MainWindowContentsCommand,
): Effect.fn.Return<void, never, DesktopWindow.DesktopWindow> {
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.runMainContentsCommand(command);
});

const checkForUpdatesFromMenu = Effect.fn("desktop.menu.checkForUpdates")(function* (
  t: ReturnType<typeof createI18n>["t"],
) {
  const updates = yield* DesktopUpdates.DesktopUpdates;
  const electronDialog = yield* ElectronDialog.ElectronDialog;
  const result = yield* updates.check("menu");
  const updateState = result.state;

  if (updateState.status === "up-to-date") {
    yield* electronDialog.showMessageBox({
      type: "info",
      title: t("desktop.updates.upToDate"),
      message: t("desktop.updates.latest", { version: updateState.currentVersion }),
      buttons: [t("desktop.updates.ok")],
    });
  } else if (updateState.status === "error") {
    yield* electronDialog.showMessageBox({
      type: "warning",
      title: t("desktop.updates.failed"),
      message: t("desktop.updates.checkFailed"),
      detail: updateState.message ?? t("desktop.updates.unknown"),
      buttons: [t("desktop.updates.ok")],
    });
  }
});

const handleCheckForUpdatesMenuClick = Effect.fn("desktop.menu.handleCheckForUpdatesClick")(
  function* (t: ReturnType<typeof createI18n>["t"]) {
    const updates = yield* DesktopUpdates.DesktopUpdates;
    const electronDialog = yield* ElectronDialog.ElectronDialog;
    const disabledReason = yield* updates.disabledReason;
    if (Option.isSome(disabledReason)) {
      yield* logUpdaterInfo("manual update check requested, but updates are disabled", {
        disabledReason: disabledReason.value,
      });
      yield* electronDialog.showMessageBox({
        type: "info",
        title: t("desktop.updates.unavailable"),
        message: t("desktop.updates.disabled"),
        detail: disabledReason.value,
        buttons: [t("desktop.updates.ok")],
      });
      return;
    }

    // Opening a window before backend confirmation can strand it on failed auth bootstrap.
    const desktopWindow = yield* DesktopWindow.DesktopWindow;
    yield* desktopWindow.activate;
    yield* checkForUpdatesFromMenu(t);
  },
);

/** @public */
export const make = Effect.gen(function* () {
  const electronMenu = yield* ElectronMenu.ElectronMenu;
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
  const app = yield* ElectronApp.ElectronApp;
  const i18n = desktopI18n;
  const context = yield* Effect.context<DesktopApplicationMenuRuntimeServices>();
  const runPromise = Effect.runPromiseWith(context);

  const runMenuEffect = <E>(
    action: string,
    effect: Effect.Effect<void, E, DesktopApplicationMenuRuntimeServices>,
  ) => {
    void runPromise(
      effect.pipe(
        Effect.annotateLogs({ action }),
        Effect.withSpan("desktop.menu.action"),
        Effect.catchCause((cause) => {
          const error = new DesktopApplicationMenuActionError({ action, cause });
          return logMenuError(error.message, { error });
        }),
      ),
    );
  };

  const configure = Effect.gen(function* () {
    const settings = yield* clientSettings.get.pipe(Effect.orElseSucceed(() => Option.none()));
    const preference = Option.getOrUndefined(settings)?.languagePreference ?? "en";
    const locale = resolveLanguage(preference, [yield* app.systemLocale]);
    yield* Effect.promise(() => i18n.changeLanguage(locale));
    const t = i18n.getFixedT(locale);
    const checkForUpdatesClick = () => {
      runMenuEffect("check-for-updates", handleCheckForUpdatesMenuClick(t));
    };
    const settingsClick = () => {
      runMenuEffect("open-settings", dispatchMenuAction("open-settings"));
    };
    // Chromium and the renderer already handle this chord; injecting another paste duplicates text.
    const pasteAsTextClick = (
      _item: Electron.MenuItem,
      _window: Electron.BaseWindow | undefined,
      event: Electron.KeyboardEvent,
    ) => {
      if (event.triggeredByAccelerator === true) return;
      runMenuEffect("paste-as-text", dispatchMenuAction("paste-as-text"));
    };
    const zoomClick = (direction: DesktopWindow.MainWindowZoomDirection) => () => {
      runMenuEffect(`zoom-${direction}`, zoomMainWindow(direction));
    };
    const mainContentsClick = (command: DesktopWindow.MainWindowContentsCommand) => () => {
      runMenuEffect(command, runMainContentsCommand(command));
    };
    const template: Electron.MenuItemConstructorOptions[] = [];

    if (environment.platform === "darwin") {
      template.push({
        label: environment.displayName,
        submenu: [
          { role: "about", label: t("desktop.menu.about", { app: environment.displayName }) },
          {
            label: t("desktop.menu.checkUpdates"),
            click: checkForUpdatesClick,
          },
          { type: "separator" },
          {
            label: t("desktop.menu.settings"),
            accelerator: "CmdOrCtrl+,",
            click: settingsClick,
          },
          { type: "separator" },
          { role: "services", label: t("desktop.menu.services") },
          { type: "separator" },
          { role: "hide", label: t("desktop.menu.hide", { app: environment.displayName }) },
          { role: "hideOthers", label: t("desktop.menu.hideOthers") },
          { role: "unhide", label: t("desktop.menu.showAll") },
          { type: "separator" },
          { role: "quit", label: t("desktop.menu.quit", { app: environment.displayName }) },
        ],
      });
    }

    template.push(
      {
        label: t("desktop.menu.file"),
        submenu: [
          ...(environment.platform === "darwin"
            ? []
            : [
                {
                  label: t("desktop.menu.settings"),
                  accelerator: "CmdOrCtrl+,",
                  click: settingsClick,
                },
                { type: "separator" as const },
              ]),
          // Cmd/Ctrl+W belongs to the renderer's tab close; it must never close the window.
          environment.platform === "darwin"
            ? { label: t("desktop.menu.closeWindow"), click: (_item, window) => window?.close() }
            : { role: "quit" },
        ],
      },
      {
        label: t("desktop.menu.edit"),
        submenu: [
          { role: "undo", label: t("desktop.menu.undo") },
          { role: "redo", label: t("desktop.menu.redo") },
          { type: "separator" },
          { role: "cut", label: t("desktop.menu.cut") },
          { role: "copy", label: t("desktop.menu.copy") },
          { role: "paste", label: t("desktop.menu.paste") },
          {
            label: t("desktop.menu.pasteText"),
            accelerator: "CmdOrCtrl+Shift+V",
            click: pasteAsTextClick,
          },
          { role: "delete", label: t("desktop.menu.delete") },
          { type: "separator" },
          { role: "selectAll", label: t("desktop.menu.selectAll") },
          ...(environment.platform === "darwin"
            ? [
                { type: "separator" as const },
                {
                  label: t("desktop.menu.speech"),
                  submenu: [
                    { role: "startSpeaking" as const, label: t("desktop.menu.startSpeaking") },
                    { role: "stopSpeaking" as const, label: t("desktop.menu.stopSpeaking") },
                  ],
                },
              ]
            : []),
        ],
      },
      {
        label: t("desktop.menu.view"),
        submenu: [
          /* Native reload/DevTools/zoom roles target focused guests; these commands must target the app. */
          {
            label: t("desktop.menu.reload"),
            accelerator: "CmdOrCtrl+R",
            click: mainContentsClick("reload"),
          },
          {
            label: t("desktop.menu.forceReload"),
            accelerator: "Shift+CmdOrCtrl+R",
            click: mainContentsClick("forceReload"),
          },
          {
            label: t("desktop.menu.devTools"),
            accelerator: environment.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
            click: mainContentsClick("toggleDevTools"),
          },
          { type: "separator" },
          {
            label: t("desktop.menu.actualSize"),
            accelerator: "CmdOrCtrl+0",
            click: zoomClick("reset"),
          },
          { label: t("desktop.menu.zoomIn"), accelerator: "CmdOrCtrl+=", click: zoomClick("in") },
          {
            label: t("desktop.menu.zoomIn"),
            accelerator: "CmdOrCtrl+Plus",
            visible: false,
            click: zoomClick("in"),
          },
          ...(environment.platform === "darwin"
            ? [
                {
                  label: t("desktop.menu.zoomIn"),
                  accelerator: "CmdOrCtrl+Shift+=",
                  visible: false,
                  click: zoomClick("in"),
                },
              ]
            : []),
          { label: t("desktop.menu.zoomOut"), accelerator: "CmdOrCtrl+-", click: zoomClick("out") },
          // Keypad codes do not match number-row accelerators.
          {
            label: t("desktop.menu.actualSize"),
            accelerator: "CmdOrCtrl+num0",
            visible: false,
            click: zoomClick("reset"),
          },
          {
            label: t("desktop.menu.zoomIn"),
            accelerator: "CmdOrCtrl+numadd",
            visible: false,
            click: zoomClick("in"),
          },
          {
            label: t("desktop.menu.zoomOut"),
            accelerator: "CmdOrCtrl+numsub",
            visible: false,
            click: zoomClick("out"),
          },
          { type: "separator" },
          { role: "togglefullscreen", label: t("desktop.menu.fullscreen") },
        ],
      },
      {
        // Electron's default Window submenu adds a Ctrl+W close role off macOS.
        role: "windowMenu",
        label: t("desktop.menu.window"),
        submenu: [
          { role: "minimize", label: t("desktop.menu.minimize") },
          { role: "zoom", label: t("desktop.menu.zoom") },
          ...(environment.platform === "darwin"
            ? [
                { type: "separator" as const },
                { role: "front" as const, label: t("desktop.menu.front") },
              ]
            : []),
        ],
      },
      {
        role: "help",
        label: t("desktop.menu.help"),
        submenu: [
          {
            label: t("desktop.menu.checkUpdates"),
            click: checkForUpdatesClick,
          },
        ],
      },
    );

    yield* electronMenu.setApplicationMenu(template);
  }).pipe(Effect.withSpan("desktop.menu.configure"));

  return DesktopApplicationMenu.of({
    configure,
  });
});

export const layer = Layer.effect(DesktopApplicationMenu, make);
