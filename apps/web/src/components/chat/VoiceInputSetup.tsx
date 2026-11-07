import { useTranslate } from "../../i18n";
import { useStableCallback } from "~/hooks/useStableCallback";
import { listBrowserMicrophones, type BrowserMicrophone } from "../../speech/browserMicrophones";
import type {
  EnvironmentId,
  EnvironmentSpeechModel,
  EnvironmentSpeechStatus,
} from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useClientSettings, updateClientSettings } from "../../hooks/useSettings";
import { useEnvironment } from "../../state/environments";
import { AuthSettingsWriteScope } from "@t3tools/contracts";
import { useEnvironmentScope } from "../../state/session";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { WizardFooter, WizardHeader, WizardPanel, WizardPopup, WizardSteps } from "../ui/wizard";

export function VoiceInputSetup(props: {
  environmentId: EnvironmentId | null;
  open: boolean;
  step: number;
  status: EnvironmentSpeechStatus | null;
  model: EnvironmentSpeechModel | null;
  downloading: boolean;
  error: string | null;
  onOpenChange(open: boolean): void;
  onDownload(): void;
  onCancelDownload(): void;
  onStartRecording(): void;
}) {
  const t = useTranslate();
  const navigate = useNavigate();
  const environment = useEnvironment(props.environmentId);
  const canManage = useEnvironmentScope(props.environmentId, AuthSettingsWriteScope);
  const selectedMicrophone = useClientSettings((settings) => settings.voiceMicrophone);
  const [microphones, setMicrophones] = useState<BrowserMicrophone[]>([]);
  const [loadingMicrophones, setLoadingMicrophones] = useState(false);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const refreshMicrophones = useStableCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    setLoadingMicrophones(true);
    try {
      setMicrophones(await listBrowserMicrophones());
      setMicrophoneError(null);
    } catch {
      setMicrophoneError("Could not list microphones. You can still use the system default.");
    }
    setLoadingMicrophones(false);
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- subscribes to native microphone changes while the device setup step is visible
  useEffect(() => {
    if (!props.open || props.step !== 1) return;
    queueMicrotask(() => void refreshMicrophones());
    const mediaDevices = navigator.mediaDevices;
    mediaDevices?.addEventListener?.("devicechange", refreshMicrophones);
    return () => mediaDevices?.removeEventListener?.("devicechange", refreshMicrophones);
  }, [props.open, props.step, refreshMicrophones]);
  const selectedIsUnavailable = Boolean(
    selectedMicrophone && !microphones.some((device) => device.deviceId === selectedMicrophone),
  );
  const selectedMicrophoneLabel = selectedMicrophone
    ? (microphones.find((device) => device.deviceId === selectedMicrophone)?.label ??
      "Selected microphone (Unavailable)")
    : t("settings.controls.systemDefault");
  const status = props.status?.supported ? props.status : null;
  const model = props.model;
  const progress =
    model?.downloaded === undefined ? null : Math.round((model.downloaded / model.size) * 100);
  const openSettings = (hash: string) => {
    props.onOpenChange(false);
    void navigate({ to: "/settings/voice", hash });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <WizardPopup>
        <WizardHeader
          title={t("release4262.set-up-voice-input")}
          description={`Transcribe speech on ${environment?.label ?? "your transcription environment"} and use voice input across environments.`}
        >
          <WizardSteps steps={["Model", "Ready to dictate"]} currentStep={props.step} />
        </WizardHeader>
        <WizardPanel>
          {props.step === 0 ? (
            <section className="space-y-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">
                    {status?.model ?? t("release4262.english-transcription-model")}
                  </h3>
                  {status?.modelId === "handy-computer/parakeet-unified-en-0.6b-gguf" ? (
                    <span className="text-xs font-medium text-primary">
                      {t("release4262.recommended-for-english")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-muted-foreground">
                  Download the {status ? Math.round(status.size / 1024 / 1024) : 697} MB model to{" "}
                  {environment?.label ?? "your transcription environment"}. Microphone audio is sent
                  there for transcription, as chosen in Voice settings.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Silero (1.2 MB), used for silence filtering and pause detection, downloads
                  alongside the speech model. An installed copy is reused.
                </p>
                {props.downloading ? (
                  <div role="status" className="mt-4 space-y-1 text-muted-foreground">
                    <div
                      role="progressbar"
                      aria-label={t("release4262.speech-model-download-progress")}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress ?? undefined}
                      className="h-1 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full bg-primary transition-[width] duration-200"
                        style={{ width: `${progress ?? 0}%` }}
                      />
                    </div>
                    <p className="text-xs">
                      {model?.state === "verifying"
                        ? t("release4262.verifying-download")
                        : progress === null
                          ? t("release4262.starting-download")
                          : `${progress}% downloaded`}
                    </p>
                  </div>
                ) : null}
              </div>
              {props.error ? (
                <p role="alert" className="text-destructive">
                  {props.error}
                </p>
              ) : null}
            </section>
          ) : (
            <section className="space-y-4 text-sm">
              <div className="space-y-2">
                <label className="font-medium" htmlFor="voice-setup-microphone">
                  {t("device.options.microphone")}
                </label>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedMicrophone ? `device:${selectedMicrophone}` : "system-default"}
                    disabled={loadingMicrophones}
                    onValueChange={(value) => {
                      if (value)
                        void updateClientSettings({
                          voiceMicrophone:
                            value === "system-default" ? "" : value.slice("device:".length),
                        });
                    }}
                  >
                    <SelectTrigger
                      id="voice-setup-microphone"
                      size="sm"
                      aria-label={t("device.options.microphone")}
                      className="min-w-0 flex-1"
                    >
                      <SelectValue>{selectedMicrophoneLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectPopup align="end" alignItemWithTrigger={false}>
                      <SelectItem value="system-default">
                        {t("settings.controls.systemDefault")}
                      </SelectItem>
                      {selectedIsUnavailable ? (
                        <SelectItem value={`device:${selectedMicrophone}`}>
                          Selected microphone (Unavailable)
                        </SelectItem>
                      ) : null}
                      {microphones.map((device) => (
                        <SelectItem key={device.deviceId} value={`device:${device.deviceId}`}>
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={loadingMicrophones}
                    aria-label={t("release4262.refresh-microphones")}
                    onClick={() => void refreshMicrophones()}
                  >
                    <RefreshCwIcon className="size-3.5" />
                  </Button>
                </div>
                {selectedIsUnavailable ? (
                  <p className="text-xs text-destructive">
                    {t("release4262.selected-mic-unavailable")}
                  </p>
                ) : null}
                {microphoneError ? (
                  <p role="alert" className="text-xs text-muted-foreground">
                    {microphoneError}
                  </p>
                ) : null}
              </div>
              <p className="text-muted-foreground">{t("release4262.voice-setup-pitch")}</p>
            </section>
          )}
        </WizardPanel>
        <WizardFooter>
          {props.step === 0 ? (
            <>
              <Button variant="outline" onClick={() => openSettings("speech-models")}>
                {t("release4262.choose-another-model-or-language")}
              </Button>
              {props.downloading ? (
                <Button variant="outline" disabled={!canManage} onClick={props.onCancelDownload}>
                  {t("release4262.cancel-download")}
                </Button>
              ) : null}
              <Button
                disabled={!canManage || props.downloading || !status}
                onClick={props.onDownload}
              >
                {props.downloading
                  ? "Downloading…"
                  : props.error
                    ? t("release4262.retry-download")
                    : canManage
                      ? t("release4262.download-model")
                      : t("release4262.ask-an-environment-admin-to-download")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => openSettings("")}>
                {t("release4262.customize-in-voice-settings")}
              </Button>
              <Button onClick={props.onStartRecording}>{t("release4262.start-dictating")}</Button>
            </>
          )}
        </WizardFooter>
      </WizardPopup>
    </Dialog>
  );
}
