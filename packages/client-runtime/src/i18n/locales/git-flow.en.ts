export const gitFlowEn = {
  "git.labels.commit": "Commit",
  "git.labels.push": "Push",
  "git.labels.create": "Create {{shortLabel}}",
  "git.labels.commitPush": "Commit & push",
  "git.labels.commitPushRequest": "Commit, push & {{shortLabel}}",
  "git.labels.publish": "Publish repository",
  "git.labels.pushCreate": "Push & create {{shortLabel}}",
  "git.labels.sync": "Sync ref",
  "git.labels.pull": "Pull",
  "git.labels.upToDate": "Branch is up to date. No action needed.",
  "git.labels.diverged": "Branch has diverged from upstream. Rebase/merge first.",
  "git.labels.pulling": "Pulling latest changes...",
  "git.labels.starting": "Starting source control action...",
  "git.default.commitPushTitle": "Commit & push to default ref?",
  "git.default.pushTitle": "Push to default ref?",
  "git.default.commitCreateTitle": "Commit, push & create {{shortLabel}} from default ref?",
  "git.default.pushCreateTitle": "Push & create {{shortLabel}} from default ref?",
  "git.default.commitPushDescription":
    'This action will commit and push changes on "{{branch}}". You can continue on this ref or create a feature ref and run the same action there.',
  "git.default.pushDescription":
    'This action will push local commits on "{{branch}}". You can continue on this ref or create a feature ref and run the same action there.',
  "git.default.commitCreateDescription":
    'This action will commit, push, and create a {{kind}} on "{{branch}}". You can continue on this ref or create a feature ref and run the same action there.',
  "git.default.pushCreateDescription":
    'This action will push local commits and create a {{kind}} on "{{branch}}". You can continue on this ref or create a feature ref and run the same action there.',
  "git.default.commitPushTo": "Commit & push to {{branch}}",
  "git.default.pushTo": "Push to {{branch}}",
  "git.default.commitCreate": "Commit, push & create {{shortLabel}}",
  "git.default.noFeature":
    "There are no changes to commit, so a feature branch can't be named. Create a branch yourself or continue on {{branch}}.",
} as const;
