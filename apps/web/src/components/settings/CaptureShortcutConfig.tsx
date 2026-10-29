import { Trans } from "react-i18next";
import { useTranslate } from "../../i18n";
import {
  isModifierPairShortcut,
  type DesktopCaptureConfigApplied,
  type DesktopCaptureConfigPreview,
  type DesktopSnapShotState,
} from "@t3tools/contracts";
import { parseKeybindingShortcut } from "@t3tools/shared/keybindings";
import { FileDiff } from "@pierre/diffs/react";
import { parseDiffFromFile } from "@pierre/diffs";
import { settlePromise } from "@t3tools/client-runtime/state/runtime";
import * as Cause from "effect/Cause";
import { useState } from "react";
import { getDesktopSnapShotBridge } from "../../lib/desktopSnapShot";
import { resolveDiffThemeName } from "../../lib/diffRendering";
import { PREFERRED_HIGHLIGHTER } from "../../lib/syntaxHighlighting";
import { useRenderedAppearance } from "../../hooks/useTheme";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { Button } from "../ui/button";
import { toastManager } from "../ui/toast";
import { shortcutToKeybindingInput } from "./KeybindingsSettings.logic";
import { useSnapShotShortcutRecorder } from "./useSnapShotShortcutRecorder";

const DEFAULT_SHORTCUT = parseKeybindingShortcut("Ctrl+Shift+2")!;

export function CaptureShortcutConfig({
  state,
  disabled = false,
  onBusyChange,
  onSaved,
  onComplete,
}: {
  state: DesktopSnapShotState;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSaved?: () => Promise<unknown>;
  onComplete?: () => Promise<void>;
}) {
  const t = useTranslate();
  const bridge = getDesktopSnapShotBridge();
  const resolvedTheme = useRenderedAppearance();
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const [preview, setPreview] = useState<DesktopCaptureConfigPreview | null>(null);
  const [result, setResult] = useState<DesktopCaptureConfigApplied | null>(null);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [working, setWorking] = useState<"reading" | "writing" | null>(null);
  const [keys, setKeys] = useState<string | null>(null);
  const [customFile, setCustomFile] = useState(false);
  const busy = disabled || working !== null;
  const changed = preview !== null && preview.before !== preview.after;
  const niri = state.linuxBackend === "niri";
  const desktop = niri ? "Niri" : "Hyprland";
  const shortcutKeys = (keys ?? preview?.shortcut)?.trim();
  const recorder = useSnapShotShortcutRecorder({
    shortcut: shortcutKeys
      ? (parseKeybindingShortcut(shortcutKeys.replace(/super/gi, "meta")) ?? DEFAULT_SHORTCUT)
      : DEFAULT_SHORTCUT,
    disabled: busy,
    allowModifierPairs: false,
    onStart: () => setError(null),
    onError: (message) => setError({ message }),
    onRecord: (shortcut) => {
      if (isModifierPairShortcut(shortcut)) return;
      setKeys(
        shortcutToKeybindingInput({
          ...shortcut,
          ctrlKey: shortcut.ctrlKey || shortcut.modKey,
          modKey: false,
        }),
      );
      setPreview(null);
      setError(null);
    },
  });
  const actionBusy = busy || recorder.recording;
  const diff =
    preview && changed
      ? parseDiffFromFile(
          { name: preview.path, contents: preview.before },
          { name: preview.path, contents: preview.after },
        )
      : null;
  const begin = (phase: "reading" | "writing") => {
    setWorking(phase);
    onBusyChange?.(true);
    setError(null);
  };
  const end = () => {
    setWorking(null);
    onBusyChange?.(false);
  };
  const read = async (chooseFile = customFile, operation: "install" | "remove" = "install") => {
    if (actionBusy || !bridge) return;
    begin("reading");
    setPreview(null);
    setResult(null);
    setCustomFile(chooseFile);
    const previewed = await settlePromise(() =>
      bridge.previewSnapShotConfig({
        operation,
        chooseFile,
        ...(keys?.trim() ? { shortcut: keys.trim() } : {}),
      }),
    );
    if (previewed._tag === "Success") {
      setPreview(previewed.value);
    } else {
      const cause = Cause.squash(previewed.cause);
      setError({
        message: "Couldn't prepare the changes. Check Advanced for help.",
        ...(cause instanceof Error ? { detail: cause.message } : {}),
      });
    }
    end();
  };
  const apply = async () => {
    if (actionBusy || !preview || !bridge) return;
    begin("writing");
    const saved = await settlePromise(async () => {
      const applied = await bridge.applySnapShotConfig(preview.id);
      setResult(applied);
      await onSaved?.();
      if (!applied.warning && preview.operation === "install" && onComplete) {
        toastManager.add({
          type: "success",
          title: t("settings.controls.shortcutSaved"),
          description: t("settings.controls.shortcutHint", { shortcut: preview.shortcut }),
        });
        await onComplete();
      }
    });
    if (saved._tag === "Failure") {
      const cause = Cause.squash(saved.cause);
      setError({
        message: "Couldn't save your shortcut. Review the changes and try again.",
        ...(cause instanceof Error ? { detail: cause.message } : {}),
      });
      setPreview(null);
    }
    end();
  };

  return (
    <div className="space-y-4 text-sm">
      {!result ? (
        <div className="flex items-center justify-between gap-3">
          <span>{t("settings.pages.CaptureShortcutConfig.shortcut")}</span>
          {recorder.input}
        </div>
      ) : null}
      {recorder.recording ? (
        <p role="status" className="text-xs text-muted-foreground">
          {t("settings.pages.CaptureShortcutConfig.press-your-shortcut-esc-cancels")}
        </p>
      ) : null}
      {result ? (
        <p role="status">
          {result.warning
            ? t(
                "web.dynamic.CaptureShortcutConfig.saved-but-the-shortcut-needs-attention-check-advanced-for-help",
              )
            : preview?.operation === "remove"
              ? t("web.dynamic.CaptureShortcutConfig.shortcut-removed")
              : t(
                  "web.dynamic.CaptureShortcutConfig.use-param-from-another-app-to-capture-a-window",
                  { value: preview?.shortcut ?? "" },
                )}
        </p>
      ) : preview ? (
        <>
          <p className="text-muted-foreground">
            {changed
              ? preview.operation === "remove"
                ? t(
                    "web.dynamic.CaptureShortcutConfig.review-the-change-below-to-remove-your-shortcut",
                  )
                : t(
                    "web.dynamic.CaptureShortcutConfig.review-the-change-below-then-save-your-shortcut",
                  )
              : preview.operation === "remove"
                ? t("web.dynamic.CaptureShortcutConfig.there-s-no-capture-shortcut-to-remove")
                : t("web.dynamic.CaptureShortcutConfig.this-shortcut-is-already-set-up")}
          </p>
          {diff ? (
            <div
              className="max-h-80 overflow-auto rounded-lg border text-xs"
              aria-label={t("settings.pages.CaptureShortcutConfig.shortcut-changes")}
            >
              <FileDiff
                fileDiff={diff}
                options={{
                  diffStyle: "unified",
                  theme: resolveDiffThemeName(resolvedTheme),
                  overflow: "wrap",
                  preferredHighlighter: PREFERRED_HIGHLIGHTER,
                }}
              />
            </div>
          ) : null}
          {changed ? (
            <p className="text-xs text-muted-foreground">
              {t(
                "settings.pages.CaptureShortcutConfig.only-these-changes-will-be-saved-we-ll-keep-a-backup",
              )}
            </p>
          ) : null}
          <div className="flex gap-2">
            {changed || preview.operation === "install" ? (
              <Button
                disabled={
                  actionBusy ||
                  (preview.operation === "install" && state.shortcutActionRegistered === false)
                }
                aria-busy={working === "writing"}
                onClick={() => void apply()}
              >
                {working === "writing"
                  ? t("web.dynamic.CaptureShortcutConfig.saving")
                  : changed
                    ? preview.operation === "install"
                      ? t("web.dynamic.CaptureShortcutConfig.save-shortcut")
                      : t("web.dynamic.CaptureShortcutConfig.remove-shortcut")
                    : t("web.dynamic.CaptureShortcutConfig.done")}
              </Button>
            ) : null}
            <Button variant="ghost" disabled={actionBusy} onClick={() => setPreview(null)}>
              {t("settings.pages.CaptureShortcutConfig.cancel")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground">
            {t(
              "settings.pages.CaptureShortcutConfig.allow-t3-code-to-read-your-desktop-settings-you-ll-review-any-changes-here-before-saving",
            )}
          </p>
          <Button
            disabled={actionBusy || !bridge}
            aria-busy={working === "reading"}
            onClick={() => void read()}
          >
            {working === "reading"
              ? t("web.dynamic.CaptureShortcutConfig.preparing-changes")
              : t("web.dynamic.CaptureShortcutConfig.review-changes")}
          </Button>
        </>
      )}
      {error ? (
        <p role="alert" className="text-destructive">
          {error.message}
        </p>
      ) : null}
      {state.shortcutActionRegistered === false && state.shortcutMessage ? (
        <p role="status" className="text-muted-foreground">
          {state.shortcutPending
            ? t("web.dynamic.CaptureShortcutConfig.connecting-to-your-desktop")
            : t(
                "web.dynamic.CaptureShortcutConfig.restart-t3-code-to-finish-connecting-your-shortcut",
              )}
        </p>
      ) : null}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">
          {t("settings.pages.CaptureShortcutConfig.advanced")}
        </summary>
        <div className="mt-3 space-y-3">
          {error?.detail || result?.warning ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                {t("settings.pages.CaptureShortcutConfig.troubleshooting")}
              </p>
              <p className="break-words">{error?.detail ?? result?.warning}</p>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {t("settings.pages.CaptureShortcutConfig.settings-file")}
            </p>
            <p className="break-all font-mono">
              {preview?.path ??
                state.shortcutConfigPath ??
                (niri ? "~/.config/niri/config.kdl" : "~/.config/hypr/hyprland.conf")}
            </p>
            {niri ? (
              <p>
                {t(
                  "settings.pages.CaptureShortcutConfig.t3-code-also-reads-any-files-included-by-this-file",
                )}
              </p>
            ) : null}
            {preview && preview.resolvedPath !== preview.path ? (
              <p className="break-all">
                <Trans
                  t={t}
                  i18nKey="web.rich.CaptureShortcutConfig.linked-to-part-the-link-will-be-kept"
                  components={{ value0: <>{preview.resolvedPath}</> }}
                />
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={actionBusy || !bridge}
              onClick={() => void read(true)}
            >
              {t("settings.pages.CaptureShortcutConfig.choose-a-different-file")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={actionBusy || !bridge}
              onClick={() => void read(customFile, "remove")}
            >
              {t("settings.pages.CaptureShortcutConfig.remove-shortcut")}
            </Button>
            {result ? (
              <Button
                size="sm"
                variant="outline"
                disabled={actionBusy || !bridge}
                onClick={() => void read()}
              >
                {t("settings.pages.CaptureShortcutConfig.review-changes")}
              </Button>
            ) : null}
          </div>
          <p>
            <Trans
              t={t}
              i18nKey="web.rich.CaptureShortcutConfig.use-your-desktop-s-shortcut-settings-file-part"
              components={{
                value0: (
                  <>
                    {niri
                      ? t(
                          "web.dynamic.CaptureShortcutConfig.a-custom-config-or-niri-config-can-change-its-location",
                        )
                      : t(
                          "web.dynamic.CaptureShortcutConfig.on-omarchy-use-your-own-bindings-file-not-its-defaults",
                        )}
                  </>
                ),
              }}
            />
          </p>
          {result?.backupPath ? (
            <p className="break-all">
              <Trans
                t={t}
                i18nKey="web.rich.CaptureShortcutConfig.backup-part"
                components={{ value0: <>{result.backupPath}</> }}
              />
            </p>
          ) : null}
          <p className="font-medium text-foreground">
            {t("settings.pages.CaptureShortcutConfig.manual-setup")}
          </p>
          <p>
            <Trans
              t={t}
              i18nKey="web.rich.CaptureShortcutConfig.part-change-the-keys-if-needed"
              components={{
                value0: (
                  <>
                    {niri
                      ? t(
                          "web.dynamic.CaptureShortcutConfig.paste-this-inside-binds-in-your-niri-config-then-save",
                        )
                      : t(
                          "web.dynamic.CaptureShortcutConfig.add-this-binding-to-your-hyprland-config-then-save",
                        )}
                  </>
                ),
              }}
            />
          </p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-muted/50 p-3">
            {state.shortcutBinding}
          </pre>
          <Button
            size="sm"
            variant="outline"
            disabled={actionBusy || !state.shortcutBinding}
            onClick={() => {
              if (state.shortcutBinding) copyToClipboard(state.shortcutBinding);
            }}
          >
            {isCopied
              ? t("web.dynamic.CaptureShortcutConfig.copied")
              : t("web.dynamic.CaptureShortcutConfig.copy-shortcut")}
          </Button>
          <p>
            <Trans
              t={t}
              i18nKey="web.rich.CaptureShortcutConfig.turn-capture-off-in-t3-code-to-stop-it-remove-the-shortcut-from-part-to-free-up-the-keys"
              components={{ value0: <>{desktop}</> }}
            />
          </p>
          {state.shortcutActionRegistered === false ? (
            <p role="status">{state.shortcutMessage}</p>
          ) : null}
          {onComplete ? (
            <Button
              size="sm"
              variant="outline"
              disabled={actionBusy || state.shortcutActionRegistered === false}
              onClick={() => void onComplete()}
            >
              {t("settings.pages.CaptureShortcutConfig.i-ve-added-the-shortcut")}
            </Button>
          ) : null}
        </div>
      </details>
    </div>
  );
}
