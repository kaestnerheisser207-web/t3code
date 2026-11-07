import type { TranslationKey } from "@t3tools/client-runtime/i18n";
import { useTranslate, webI18n } from "../../i18n";
import { MICROPHONE_PERMISSION_ERROR } from "@t3tools/client-runtime/voice-input";
import { useNavigate } from "@tanstack/react-router";
import { RotateCcwIcon, SettingsIcon, XIcon } from "lucide-react";

import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { VoiceInputPill } from "./VoiceInputPill";

const VOICE_ERROR_LABELS: Record<string, TranslationKey> = {
  [MICROPHONE_PERMISSION_ERROR]: "release4262.microphone-access-needed",
  "Microphone access is required for voice input.": "release4262.microphone-access-needed",
  "This draft is no longer available.": "release4262.draft-unavailable",
  "Another voice recording is already active.": "release4262.another-recording-active",
  "Voice transcription is not available.": "release4262.voice-input-unavailable",
  "Voice transcription is still finishing. Try again shortly.":
    "release4262.transcription-still-busy",
  "Voice transcription is not available for this language.": "release4262.language-unsupported",
  "Could not prepare voice transcription.": "release4262.couldn-t-prepare-dictation",
  "Could not start voice recording.": "release4262.couldn-t-start-recording",
  "Voice recording was interrupted.": "release4262.recording-interrupted",
  "Could not finish voice recording.": "release4262.couldn-t-finish-recording",
  "Could not transcribe this recording.": "release4262.transcription-failed",
  "Voice transcription on this environment failed.": "release4262.transcription-failed",
  "The draft changed while voice input was running. The transcript was not added.":
    "release4262.draft-changed",
  "No speech was detected.": "release4262.no-speech-detected",
  "Microphone processing failed.": "release4262.microphone-processing-failed",
  "The microphone disconnected.": "release4262.microphone-disconnected",
};

function voiceErrorLabel(error: string | null): string {
  return webI18n.t((error && VOICE_ERROR_LABELS[error]) || "release4262.voice-input-failed");
}

export function VoiceInputErrorPill(props: {
  error: string | null;
  errorAction: "retry" | "settings" | null;
  disabled?: boolean;
  cancelShortcutLabel?: string | null;
  onRetry(): void;
  onDismiss(): void;
}) {
  const t = useTranslate();
  const navigate = useNavigate();
  const openSettings = props.errorAction === "settings";
  const actionLabel = openSettings
    ? t("release4262.open-voice-settings")
    : props.error === "Could not transcribe this recording." ||
        props.error === "Voice transcription on this environment failed."
      ? t("release4262.retry-transcription")
      : t("release4262.record-again");
  return (
    <VoiceInputPill>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="icon-sm-pill"
              variant="ghost"
              aria-label={t("mobile.dynamic.GlobalVoiceInputControl.dismiss-voice-input-error")}
              onPointerDown={(event) => event.preventDefault()}
              onClick={props.onDismiss}
            >
              <XIcon />
            </Button>
          }
        />
        <TooltipPopup side="top">
          {t("mobile.dynamic.GlobalVoiceInputControl.dismiss-voice-input-error")}
          {props.cancelShortcutLabel ? ` (${props.cancelShortcutLabel})` : ""}
        </TooltipPopup>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              role="status"
              aria-label={props.error ?? t("release4262.voice-input-failed")}
              className="min-w-0 flex-1 truncate text-sm text-destructive"
            />
          }
        >
          {voiceErrorLabel(props.error)}
        </TooltipTrigger>
        <TooltipPopup side="top">{props.error ?? t("release4262.voice-input-failed")}</TooltipPopup>
      </Tooltip>
      {props.errorAction ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-sm-pill"
                variant="ghost"
                aria-label={actionLabel}
                disabled={props.disabled}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (openSettings) {
                    props.onDismiss();
                    void navigate({ to: "/settings/voice" });
                  } else {
                    props.onRetry();
                  }
                }}
              >
                {openSettings ? <SettingsIcon /> : <RotateCcwIcon />}
              </Button>
            }
          />
          <TooltipPopup side="top">{actionLabel}</TooltipPopup>
        </Tooltip>
      ) : null}
    </VoiceInputPill>
  );
}
