export const runtimeOptionsEn = {
  "runtime.supervised": "Supervised",
  "runtime.supervisedDescription": "Ask before commands and file changes.",
  "runtime.autoEdits": "Auto-accept edits",
  "runtime.autoEditsDescription": "Auto-approve edits, ask before other actions.",
  "runtime.auto": "Auto",
  "runtime.autoDescription": "Supported providers approve routine actions; others still ask.",
  "runtime.full": "Full access",
  "runtime.fullDescription": "Allow commands and edits without prompts.",
  "followUp.queue": "Queue",
  "followUp.queueDescription": "Your message waits and runs after the current turn finishes.",
  "followUp.steer": "Steer",
  "followUp.steerDescription":
    "Your message reaches the agent right away, changing what it is working on.",
  "runtime.readOnly": "Read only",
  "runtime.readOnlyDescription":
    "Read projects and threads. Cannot start, message or change anything.",
} as const;
