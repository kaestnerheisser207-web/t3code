export const webPrFailuresEn = {
  "web.pr.failure.merge": "Could not merge this {{kind}}",
  "web.pr.failure.ready": "Could not mark this ready for review",
  "web.pr.failure.draft": "Could not convert this to a draft",
  "web.pr.failure.close": "Could not close this {{kind}}",
  "web.pr.failure.reopen": "Could not reopen this {{kind}}",
  "web.pr.failure.update-branch": "Could not update this branch",
  "web.pr.failure.enable-auto-merge": "Could not turn on auto-merge",
  "web.pr.failure.disable-auto-merge": "Could not turn off auto-merge",
  "web.pr.failure.revert": "Could not open a revert {{kind}}",
  "web.pr.failure.delete-branch": "Could not delete this branch",
  "web.pr.failure.approve-workflows": "Could not approve workflows",
  "web.pr.hint.merge":
    "The host refused the merge. Check that you have write access, that the checks it requires have passed, and that the branch is not conflicting.",
  "web.pr.hint.ready": "The host refused it. Check that you have write access to this repository.",
  "web.pr.hint.draft": "The host refused it. Check that you have write access to this repository.",
  "web.pr.hint.close":
    "The host refused it. Check that you have write access, or that you opened it.",
  "web.pr.hint.reopen":
    "The host refused it. Check that you have write access, and that the branch still exists.",
  "web.pr.hint.update-branch":
    "The host refused it. Check that you have write access to the branch (a fork branch also needs its author to allow edits from maintainers), and that it does not conflict with the base.",
  "web.pr.hint.enable-auto-merge":
    "The host refused it. Check that this repository allows auto-merge, that you have write access, and that there is something left for it to wait on.",
  "web.pr.hint.disable-auto-merge":
    "The host refused it. Check that you have write access, and that the merge has not already happened.",
  "web.pr.hint.revert":
    "The host refused it. Check that you have write access and that this {{kind}} was merged on the host.",
  "web.pr.hint.delete-branch":
    "The host refused it. Check that you have write access to the source repository and that the branch has not moved since this page loaded.",
  "web.pr.hint.approve-workflows":
    "The host refused it. Check that you have Actions write access and that these workflow runs are still awaiting approval.",
  "web.pr.rebaseFailure":
    "The host refused it. A rebase stops at the first commit that does not apply cleanly; updating with a merge commit may still work.",
  "web.pr.tab.summary": "Summary",
  "web.pr.tab.guide": "Guide",
  "web.pr.tab.timeline": "Timeline",
  "web.pr.tab.code": "Code",
} as const;
