import { Platform } from "react-native";
import { useNativeControlLabels } from "./useNativeControlLabels";
import { requireNativeView } from "expo";
import type { PropsWithChildren } from "react";
import type { NativeSyntheticEvent, ViewProps } from "react-native";

import type { HardwareKeyboardCommand } from "../features/keyboard/hardwareKeyboardCommands";

interface NativeKeyboardCommandsProps extends ViewProps {
  readonly labels?: Readonly<Record<string, string>>;
  readonly enabledCommands: ReadonlyArray<HardwareKeyboardCommand>;
  readonly onCommand: (
    event: NativeSyntheticEvent<{ readonly command: HardwareKeyboardCommand }>,
  ) => void;
}

const NativeKeyboardCommands = requireNativeView<NativeKeyboardCommandsProps>("T3KeyboardCommands");

export function T3KeyboardCommands(
  props: PropsWithChildren<{
    readonly enabledCommands: ReadonlyArray<HardwareKeyboardCommand>;
    readonly onCommand: (command: HardwareKeyboardCommand) => void;
  }>,
) {
  const labels = useNativeControlLabels();
  return (
    <NativeKeyboardCommands
      onCommand={(event) => props.onCommand(event.nativeEvent.command)}
      enabledCommands={props.enabledCommands}
      {...(Platform.OS === "ios" ? { labels } : {})}
      style={{ flex: 1 }}
    >
      {props.children}
    </NativeKeyboardCommands>
  );
}
