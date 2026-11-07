import type { TranslationKey } from "@t3tools/client-runtime/i18n";
import { mobileI18n } from "../i18n";
import { requireOptionalNativeModule } from "expo";
import type { RecorderState, RecordingStatus } from "expo-audio";
import { Platform } from "react-native";
import type { NativeVoiceRecorder } from "../features/voice-input/lazyVoiceRecorder";

import {
  VoiceTranscriptionError,
  throwIfVoiceTranscriptionAborted,
  type VoiceTranscriber,
} from "@t3tools/client-runtime/voice-input";

type PreparedGoogleTranscription = { readonly locale: string; readonly mode: number };

type GoogleTranscriptionModule = {
  checkAvailability(): Promise<boolean>;
  prepare(id: number): Promise<PreparedGoogleTranscription>;
  transcribe(id: number, uri: string, locale: string, mode: number): Promise<string>;
  cancel(id: number): Promise<void>;
  readonly LiveVoiceRecorder?: new () => NativeVoiceRecorder<RecordingStatus, RecorderState>;
  startLive?(id: number, uri: string, locale: string, mode: number): Promise<string>;
};

const native = requireOptionalNativeModule<GoogleTranscriptionModule>("T3VoiceTranscription");

const nativeErrorMessages: Readonly<Record<string, TranslationKey>> = {
  unavailable: "release4262.on-device-voice-transcription-is-not-available-f",
  storage: "release4262.not-enough-storage-for-on-device-dictation-free-",
  quota: "release4262.on-device-speech-quota-reached-let-the-device-re",
  "no-speech": "release4262.no-speech-was-detected-speak-again-and-retry-dic",
  busy: "release4262.on-device-speech-is-busy-wait-for-it-to-finish-t",
  "needs-update": "release4262.update-android-and-its-on-device-speech-services",
  "download-failed": "release4262.speech-model-download-failed-check-your-network-",
  "audio-overflow": "release4262.the-speech-engine-could-not-process-the-complete",
  "incomplete-audio": "release4262.speech-recognition-could-not-process-the-complet",
};

let nextOperationId = 0;

export function createLiveVoiceRecorder() {
  return Number(Platform.Version) >= 31 && native?.LiveVoiceRecorder
    ? new native.LiveVoiceRecorder()
    : null;
}

export async function getLocalVoiceTranscriber(): Promise<VoiceTranscriber | null> {
  if (!native || !(await native.checkAvailability())) return null;
  const module = native;
  return {
    prepare: async ({ signal }) => {
      const prepared = await runOperation(module, signal, "preparation-failed", (id) =>
        module.prepare(id),
      );
      const startLive = module.startLive?.bind(module);
      return {
        locale: prepared.locale,
        ...(module.LiveVoiceRecorder && startLive
          ? {
              start: (uri: string, { signal }: { signal: AbortSignal }) =>
                runOperation(module, signal, "transcription-failed", (id) =>
                  startLive(id, uri, prepared.locale, prepared.mode),
                ),
            }
          : {}),
        transcribe: (uri, { signal }) =>
          runOperation(module, signal, "transcription-failed", (id) =>
            module.transcribe(id, uri, prepared.locale, prepared.mode),
          ),
      };
    },
  };
}

async function runOperation<T>(
  module: GoogleTranscriptionModule,
  signal: AbortSignal,
  fallbackCode: "preparation-failed" | "transcription-failed",
  operation: (id: number) => Promise<T>,
): Promise<T> {
  throwIfVoiceTranscriptionAborted(signal);
  const id = ++nextOperationId;
  let cancellation: Promise<void> | undefined;
  const abort = () => {
    cancellation = module.cancel(id).catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const result = await operation(id);
    throwIfVoiceTranscriptionAborted(signal);
    return result;
  } catch (error) {
    throwIfVoiceTranscriptionAborted(signal);
    const code =
      typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    throw new VoiceTranscriptionError({
      code: code === "unavailable" || code === "unsupported-locale" ? code : fallbackCode,
      message:
        (typeof code === "string" && nativeErrorMessages[code]
          ? mobileI18n.t(nativeErrorMessages[code])
          : undefined) ??
        (fallbackCode === "preparation-failed"
          ? mobileI18n.t("release4262.voice-transcription-could-not-prepare-this-langu")
          : mobileI18n.t("release4262.voice-transcription-failed")),
      cause: error,
    });
  } finally {
    signal.removeEventListener("abort", abort);
    await cancellation;
  }
}
