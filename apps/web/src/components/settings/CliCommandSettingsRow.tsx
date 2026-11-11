import { useTranslate } from "../../i18n";
import { useState } from "react";

import {
  desktopCliCommandStateAtom,
  getDesktopCliCommandBridge,
  refreshDesktopCliCommandState,
} from "~/state/desktopCliCommand";
import { useEnvironmentQuery } from "~/state/query";
import { Button } from "../ui/button";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { SettingsRow } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

const FAILURE_TITLE_KEYS = {
  install: "release4491.cli-install-failed",
  uninstall: "release4491.cli-remove-failed",
  addToPath: "release4491.cli-path-failed",
} as const;

/** The desktop `t3` command's state, and its actions with a toast on failure. */
export function useDesktopCliCommand() {
  const t = useTranslate();
  const bridge = getDesktopCliCommandBridge();
  const query = useEnvironmentQuery(bridge ? desktopCliCommandStateAtom : null);
  const [pending, setPending] = useState(false);

  const run = (action: keyof typeof FAILURE_TITLE_KEYS) => {
    if (!bridge || pending) return;
    setPending(true);
    void bridge[action]()
      .then(refreshDesktopCliCommandState)
      .catch((error: unknown) => {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: t(FAILURE_TITLE_KEYS[action]),
            description:
              error instanceof Error
                ? error.message
                : t("web.remaining.__root.something-went-wrong"),
          }),
        );
      })
      .finally(() => setPending(false));
  };

  return {
    state: bridge ? query.data : undefined,
    busy: pending || query.isPending,
    run,
  };
}

export function CliCommandSettingsRow() {
  const t = useTranslate();
  const { state, busy, run } = useDesktopCliCommand();

  if (!state?.supported) return null;
  const installed = state.installedPath !== null;
  const description = state.shadowedBy
    ? t("release4491.cli-shadowed", { value0: state.shadowedBy })
    : !installed
      ? t("release4491.cli-use")
      : state.onPath
        ? t("release4491.cli-installed", { value0: state.installedPath })
        : state.pathSetup?.added
          ? t("release4491.cli-installed-path", {
              value0: state.installedPath,
              value1: state.pathSetup.file,
            })
          : t("release4491.cli-needs-path", {
              value0: state.installedPath,
              value1: state.pathSetup ? "" : " Add its folder to your PATH to run `t3`.",
            });

  return (
    <SettingsRow
      {...searchableSetting("cli-command")}
      description={description}
      control={
        <div className="flex gap-2">
          {state.pathSetup && !state.pathSetup.added ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run("addToPath")}>
              {t("release4491.text575")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={busy || (!installed && Boolean(state.shadowedBy))}
            onClick={() => run(installed ? "uninstall" : "install")}
          >
            {installed
              ? t("web.dynamic.CliCommandSettingsRow.remove")
              : t("web.dynamic.CliCommandSettingsRow.install")}
          </Button>
        </div>
      }
    />
  );
}
