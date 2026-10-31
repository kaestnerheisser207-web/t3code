import type { TFunction } from "i18next";
import type { EnvironmentProject, EnvironmentThreadShell } from "./models.ts";

export function planProjectRemoval<
  Thread extends Pick<EnvironmentThreadShell, "environmentId" | "projectId">,
>(
  options: {
    readonly members: ReadonlyArray<
      Pick<EnvironmentProject, "id" | "environmentId" | "title" | "workspaceRoot"> & {
        readonly environmentLabel?: string | null;
      }
    >;
    readonly groupMemberCount: number;
    readonly hasOtherMembers: boolean;
    readonly displayName: string;
    readonly threads: ReadonlyArray<Thread>;
    /** The members' threads this client does not hold: older settled threads its shell left out. */
    readonly unloadedThreadCount?: number;
  },
  t?: TFunction,
) {
  const { members, groupMemberCount, hasOtherMembers, displayName, threads } = options;
  const memberKeys = new Set(members.map((member) => `${member.environmentId}:${member.id}`));
  const projectThreads = threads.filter((thread) =>
    memberKeys.has(`${thread.environmentId}:${thread.projectId}`),
  );
  const threadCount = projectThreads.length + (options.unloadedThreadCount ?? 0);
  const isWholeGroup = members.length === groupMemberCount;
  const targetKind = hasOtherMembers || !isWholeGroup ? "checkout" : "project";
  const singleMember = members.length === 1 ? members[0]! : null;
  const targetLabel = singleMember?.title ?? displayName;
  const confirmationMessage = [
    threadCount > 0
      ? (t?.("project.remove.withThreads", {
          kind: t(`project.remove.${targetKind}`),
          name: targetLabel,
          count: threadCount,
        }) ??
        `Remove ${targetKind} "${targetLabel}" and delete its ${threadCount} thread${threadCount === 1 ? "" : "s"}?`)
      : (t?.("project.remove.empty", {
          kind: t(`project.remove.${targetKind}`),
          name: targetLabel,
        }) ?? `Remove ${targetKind} "${targetLabel}"?`),
    ...(singleMember
      ? [
          t?.("project.remove.path", { path: singleMember.workspaceRoot }) ??
            `Path: ${singleMember.workspaceRoot}`,
          ...(singleMember.environmentLabel
            ? [
                t?.("project.remove.environment", { environment: singleMember.environmentLabel }) ??
                  `Environment: ${singleMember.environmentLabel}`,
              ]
            : []),
        ]
      : [
          t?.("project.remove.entries", { count: members.length }) ??
            `This removes ${members.length} grouped project entries.`,
        ]),
    ...(threadCount > 0
      ? [
          "Those threads and any archived threads are deleted from T3 Code. Provider sessions are kept.",
        ]
      : ["Any archived threads are deleted from T3 Code. Provider sessions are kept."]),
    isWholeGroup && !hasOtherMembers
      ? (t?.("project.remove.keepFiles") ??
        "This removes only the project entries, not the files on disk.")
      : (t?.("project.remove.keepOthers") ??
        "Other entries in this grouped project are unaffected."),
    t?.("project.remove.irreversible") ?? "This action cannot be undone.",
  ].join("\n");

  return { projectThreads, isWholeGroup, targetKind, confirmationMessage };
}
