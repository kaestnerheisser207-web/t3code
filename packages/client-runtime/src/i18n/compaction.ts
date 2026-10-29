import type { OrchestrationV2IdleCompaction } from "@t3tools/contracts";
import type { TFunction } from "i18next";

export function idleCompactionTitle(reason: OrchestrationV2IdleCompaction, t: TFunction) {
  return t(
    reason === "beforeCacheExpires" ? "compaction.titleBeforeCache" : "compaction.titleOnReturn",
  );
}

export function idleCompactingLabel(reason: OrchestrationV2IdleCompaction, t: TFunction) {
  return t(reason === "beforeCacheExpires" ? "compaction.beforeCache" : "compaction.onReturn");
}
