import type { RuntimeMode } from "@t3tools/contracts";
import type { TFunction } from "i18next";
const keys = {
  "approval-required": ["runtime.supervised", "runtime.supervisedDescription"],
  "auto-accept-edits": ["runtime.autoEdits", "runtime.autoEditsDescription"],
  auto: ["runtime.auto", "runtime.autoDescription"],
  "full-access": ["runtime.full", "runtime.fullDescription"],
  "read-only": ["runtime.readOnly", "runtime.readOnlyDescription"],
} as const;
export function runtimeModeText(t: TFunction, mode: RuntimeMode | "read-only") {
  const [label, description] = keys[mode];
  return { label: t(label), description: t(description) };
}
