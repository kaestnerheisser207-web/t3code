import { useSyncExternalStore } from "react";

import {
  formatRelativeElapsed,
  formatRelativeTimeLabel,
  msUntilRelativeTimeChange,
  relativeTimeElapsedMs,
  type RelativeTimeState,
} from "../timestampFormat";

export function useRelativeTimeState(isoDate: string | null, language?: string): RelativeTimeState {
  const subscribe = (onChange: () => void) => {
    if (isoDate === null) return () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const delayMs = msUntilRelativeTimeChange(isoDate);
      if (delayMs === null) return;
      timer = setTimeout(() => {
        onChange();
        schedule();
      }, delayMs);
    };
    schedule();
    return () => clearTimeout(timer);
  };
  const getSnapshot = () => (isoDate === null ? null : relativeTimeElapsedMs(isoDate));
  const elapsedMs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (isoDate === null) return { status: "missing" };
  if (elapsedMs === null) return { status: "invalid" };
  if (language && language !== "en") {
    return {
      status: "relative",
      value: formatRelativeTimeLabel(isoDate, Date.parse(isoDate) + elapsedMs, language),
      suffix: null,
    };
  }
  return { status: "relative", ...formatRelativeElapsed(elapsedMs) };
}
