import { mobileI18n } from "../../i18n";
import { Alert } from "react-native";
import type { ConfirmDialogRequest, TextInputDialogRequest } from "./Dialog.types";

export type { ConfirmDialogRequest, TextInputDialogRequest } from "./Dialog.types";

export function alert(...[title, message, buttons, options]: Parameters<typeof Alert.alert>): void {
  Alert.alert(
    title,
    message,
    buttons?.length ? buttons : [{ text: mobileI18n.t("common.ok") }],
    options,
  );
}

export function confirm(request: ConfirmDialogRequest): void {
  Alert.alert(request.title, request.message, [
    {
      text: request.cancelText ?? mobileI18n.t("common.cancel"),
      style: "cancel",
      onPress: request.onCancel,
    },
    {
      text: request.confirmText,
      style: request.destructive ? "destructive" : "default",
      onPress: request.onConfirm,
    },
  ]);
}

export function prompt(request: TextInputDialogRequest): void {
  Alert.prompt(
    request.title,
    request.message,
    [
      {
        text: request.cancelText ?? mobileI18n.t("common.cancel"),
        style: "cancel",
        onPress: request.onCancel,
      },
      { text: request.confirmText, onPress: (value) => request.onConfirm(value ?? "") },
    ],
    "plain-text",
    request.initialValue,
  );
}

export function Host() {
  return null;
}
