import { resources, type TranslationKey } from "@t3tools/client-runtime/i18n";
import type { TFunction } from "i18next";
import { HOSTED_APP_CHANNEL } from "~/branding";
import { isElectron } from "~/env";
import { isMacPlatform, isWindowsPlatform, normalizeSearchText } from "~/lib/utils";
import { STATIC_KEYBINDING_COMMANDS, type KeybindingCommand } from "@t3tools/contracts";
import type { EnvironmentId } from "@t3tools/contracts";
import type { EnvironmentConnectionPhase } from "@t3tools/client-runtime/connection";
import {
  sourceControlClients,
  type SourceControlDefinition,
} from "@t3tools/client-runtime/source-control-clients";
import { DEFAULT_KEYBINDINGS } from "@t3tools/shared/keybindings";
import * as Schema from "effect/Schema";
import { TYPOGRAPHY_ADVANCED_STORAGE_KEY } from "../../appearanceFonts";
import { writeLocalStorageValue } from "../../hooks/useLocalStorage";
import { commandLabel } from "./KeybindingsSettings.logic";
import type { ResolvedSettingsScope } from "./settingsScope";

export type SettingsPath =
  | "/settings/projects"
  | "/settings/general"
  | "/settings/diagnostics"
  | "/settings/appearance"
  | "/settings/chat"
  | "/settings/diffs"
  | "/settings/keybindings"
  | "/settings/snap-shot"
  | "/settings/providers"
  | "/settings/threads"
  | "/settings/browser"
  | "/settings/devices"
  | "/settings/scheduled-tasks"
  | "/settings/source-control"
  | "/settings/worktrees"
  | "/settings/connections"
  | "/settings/access"
  | "/settings/maintenance"
  | "/settings/labs"
  | "/settings/about"
  | "/settings/archived";

export type SettingsSearchScope =
  | "environment"
  | "environment-defaults"
  | "project-defaults"
  | "project"
  | "checkout"
  | "connections";

export interface SettingsSearchItem {
  readonly id: string;
  readonly title: string;
  readonly titleKey?: TranslationKey;
  readonly to: SettingsPath;
  readonly targetId?: string;
  readonly searchTerms?: ReadonlyArray<string>;
  readonly scope?: SettingsSearchScope;
  readonly desktopOnly?: boolean;
  readonly macOnly?: boolean;
  readonly windowsOnly?: boolean;
  readonly releaseChannelOnly?: boolean;
  readonly cloudOnly?: boolean;
  readonly environmentOnly?: boolean;
  readonly providerSettingsOnly?: boolean;
  readonly macProviderSettingsOnly?: boolean;
  readonly localBackendManagementOnly?: boolean;
  readonly localEnvironmentOnly?: boolean;
  readonly wslAvailableOnly?: boolean;
  readonly managedTunnelOnly?: boolean;
  readonly peerLinksOnly?: boolean;
  readonly secondary?: boolean;
  readonly requiresThreadAutoSettlement?: boolean;
}

export interface SettingsSearchAvailability {
  readonly localEnvironmentDisabled?: boolean;
  readonly hasCloudPublicConfig: boolean;
  readonly hasEnvironment: boolean;
  readonly hasProviderSettingsEnvironment: boolean;
  readonly hasMacProviderSettingsEnvironment: boolean;
  readonly canManageLocalBackend: boolean;
  readonly isWslSettingsRowVisible: boolean;
  readonly hasThreadAutoSettlement: boolean;
  readonly managedTunnelActive?: boolean;
  readonly hasPeerLinkHost?: boolean;
}

export const SETTINGS_SECTION_KEYS = {
  "/settings/general": "settings.general",
  "/settings/appearance": "settings.appearance",
  "/settings/chat": "settings.chat",
  "/settings/diffs": "settings.diffs",
  "/settings/keybindings": "settings.keybindings",
  "/settings/snap-shot": "settings.snapShot",
  "/settings/providers": "settings.providers",
  "/settings/threads": "settings.threads",
  "/settings/browser": "settings.browser",
  "/settings/devices": "settings.devices",
  "/settings/scheduled-tasks": "settings.scheduledTasks",
  "/settings/source-control": "settings.sourceControl",
  "/settings/worktrees": "settings.worktrees",
  "/settings/connections": "settings.environments",
  "/settings/access": "settings.access",
  "/settings/maintenance": "settings.maintenance",
  "/settings/labs": "settings.labs",
  "/settings/about": "settings.about",
  "/settings/archived": "settings.archived",
  "/settings/diagnostics": "settings.diagnostics",
  "/settings/projects": "settings.projects",
} as const satisfies Record<SettingsPath, TranslationKey>;

export const SETTINGS_SECTION_LABELS = Object.fromEntries(
  Object.entries(SETTINGS_SECTION_KEYS).map(([path, key]) => [path, resources.en.translation[key]]),
) as Readonly<Record<SettingsPath, string>>;

/** Sidebar order. A group without a heading is set apart by space alone. */
export const SETTINGS_NAV_GROUPS: ReadonlyArray<{
  readonly heading: string | null;
  readonly paths: ReadonlyArray<SettingsPath>;
}> = [
  {
    heading: null,
    paths: [
      "/settings/general",
      "/settings/appearance",
      "/settings/chat",
      "/settings/diffs",
      "/settings/keybindings",
      "/settings/snap-shot",
    ],
  },
  {
    heading: "Agents",
    paths: [
      "/settings/providers",
      "/settings/threads",
      "/settings/browser",
      "/settings/devices",
      "/settings/scheduled-tasks",
    ],
  },
  {
    heading: "Code",
    paths: ["/settings/projects", "/settings/source-control", "/settings/worktrees"],
  },
  { heading: "Connections", paths: ["/settings/connections", "/settings/access"] },
  {
    heading: null,
    paths: ["/settings/maintenance", "/settings/labs", "/settings/about", "/settings/archived"],
  },
];

export function keybindingSearchAnchorId<Command extends KeybindingCommand>(command: Command) {
  return `keybinding-${command}` as const;
}

const KEYBINDING_SEARCH_ITEMS = STATIC_KEYBINDING_COMMANDS.toSorted((left, right) =>
  commandLabel(left).localeCompare(commandLabel(right)),
).map((command) => {
  const defaultKeys = DEFAULT_KEYBINDINGS.filter((binding) => binding.command === command).map(
    (binding) => binding.key,
  );
  return {
    id: keybindingSearchAnchorId(command),
    title: commandLabel(command),
    to: "/settings/keybindings" as const,
    searchTerms: [command, ...defaultKeys],
    secondary: true,
    ...(defaultKeys.length === 0 ? { targetId: "keybindings" } : {}),
  };
});

export function sourceControlHostSettingsSearchId(kind: string) {
  return `source-control-host-${kind}` as const;
}

/** Each host's own settings: its accounts and token, or the fields of its settings form. */
export function sourceControlHostSearchItems(
  definitions: ReadonlyArray<SourceControlDefinition>,
): ReadonlyArray<
  SettingsSearchItem & { readonly id: ReturnType<typeof sourceControlHostSettingsSearchId> }
> {
  return definitions.flatMap((definition) => {
    if (!definition.settings) return [];
    const names = [definition.label, ...(definition.searchKeywords ?? [])].join(" ");
    const { credentials } = definition;
    return [
      {
        id: sourceControlHostSettingsSearchId(definition.kind),
        title: credentials
          ? `${definition.label} accounts and token`
          : `${definition.label} credentials`,
        to: "/settings/source-control" as const,
        searchTerms: [
          credentials
            ? `${names} ${credentials.cliName} account login user host switch multiple accounts disable sign in token personal access token pat api key credential`
            : `${names} ${Object.keys(definition.settings.fields).join(" ")} token credentials sign in`,
        ],
        environmentOnly: true,
        scope: "environment-defaults" as const,
      },
    ];
  });
}

/** For settings that apply to every host. */
const SOURCE_CONTROL_HOST_LABELS = sourceControlClients.definitions
  .map((definition) => definition.label)
  .join(" ");
const SOURCE_CONTROL_HOST_TERMS = sourceControlClients.definitions
  .flatMap((definition) => [definition.label, ...(definition.searchKeywords ?? [])])
  .join(" ");

const SETTINGS_SEARCH_DEFINITIONS = [
  {
    id: "interface-language",
    titleKey: "language.title",
    to: "/settings/general",
    searchTerms: ["language locale English Chinese system 界面语言 中文 简体中文 英语 跟随系统"],
  },
  {
    id: "storage-worktree-keep-when",
    targetId: "storage-worktrees",
    titleKey: "settings.items.storage-worktree-keep-when.title",
    to: "/settings/worktrees",
    scope: "project-defaults",
    searchTerms: [
      "any local files uncommitted changes edited tracked files ignored env build output cleanup",
    ],
  },
  {
    id: "storage-delete-now",
    titleKey: "settings.items.storage-delete-now.title",
    to: "/settings/maintenance",
    scope: "environment-defaults",
    searchTerms: ["storage cleanup run now results report removed kept failed"],
  },
  {
    id: "storage-worktrees",
    titleKey: "settings.items.storage-worktrees.title",
    to: "/settings/worktrees",
    scope: "project-defaults",
    searchTerms: [
      "disk storage delete deleted archived threads old inactive merged unchanged worktrees retention days project inherit off custom",
    ],
  },
  {
    id: "storage-worktrees-location",
    titleKey: "settings.items.storage-worktrees-location.title",
    to: "/settings/worktrees",
    scope: "environment-defaults",
    searchTerms: ["worktree location folder directory path drive external disk"],
  },
  {
    id: "storage-artifacts",
    titleKey: "settings.items.storage-artifacts.title",
    to: "/settings/maintenance",
    scope: "environment-defaults",
    searchTerms: ["disk storage browser screenshots captures rotated logs cleanup retention"],
  },
  {
    id: "project-defaults",
    titleKey: "settings.items.project-defaults.title",
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: ["model workspace environments projects inheritance checkout"],
  },
  {
    id: "project-overview",
    titleKey: "settings.items.project-overview.title",
    to: "/settings/projects",
    searchTerms: ["name icon emoji image checkout remove delete"],
  },
  {
    id: "default-model",
    titleKey: "settings.items.default-model.title",
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: ["new thread project provider reasoning effort"],
  },
  {
    id: "default-permissions",
    titleKey: "settings.items.default-permissions.title",
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: [
      "new thread default runtime mode supervised approvals auto accept edits full access",
    ],
  },
  {
    id: "color-scheme",
    titleKey: "settings.items.color-scheme.title",
    to: "/settings/appearance",
    searchTerms: ["appearance light dark system mode"],
    targetId: "appearance",
  },
  {
    id: "theme",
    titleKey: "settings.items.theme.title",
    to: "/settings/appearance",
    searchTerms: ["appearance colors palette custom import"],
    targetId: "appearance",
  },
  {
    // Prefixed because the slider control already owns the `appearance-contrast` id.
    id: "setting-appearance-contrast",
    titleKey: "settings.items.setting-appearance-contrast.title",
    to: "/settings/appearance",
    searchTerms: ["colors borders interface"],
  },
  {
    // Prefixed because the slider control already owns the `glass-opacity` id.
    id: "setting-glass-opacity",
    titleKey: "settings.items.setting-glass-opacity.title",
    to: "/settings/appearance",
    searchTerms: ["transparent transparency solid menus dialogs composer"],
  },
  {
    id: "diff-color-scheme",
    titleKey: "settings.items.diff-color-scheme.title",
    to: "/settings/diffs",
    searchTerms: ["red green blue orange additions deletions changes counts palette colorblind"],
  },
  {
    id: "chat-width",
    titleKey: "settings.items.chat-width.title",
    to: "/settings/appearance",
    searchTerms: ["wide full width column layout messages composer monitor"],
  },
  {
    id: "effort-display",
    titleKey: "nightly.effortDisplay",
    to: "/settings/appearance",
    searchTerms: ["reasoning effort thinking bars graph word label level composer"],
  },
  {
    id: "math-rendering",
    titleKey: "settings.items.math-rendering.title",
    to: "/settings/appearance",
    searchTerms: ["latex tex katex equations formulas markdown"],
  },
  {
    id: "panel-animations",
    titleKey: "settings.items.panel-animations.title",
    to: "/settings/appearance",
  },
  {
    id: "environment-identification",
    titleKey: "settings.items.environment-identification.title",
    to: "/settings/appearance",
    searchTerms: ["dev nightly latest channel artwork pill label hide none"],
    targetId: "appearance-interface",
  },
  {
    id: "interface-font",
    titleKey: "settings.items.interface-font.title",
    to: "/settings/appearance",
    searchTerms: ["typography family size system sans"],
  },
  {
    id: "prompt-font",
    titleKey: "settings.items.prompt-font.title",
    to: "/settings/appearance",
    searchTerms: ["typography family size composer input"],
  },
  {
    id: "code-font",
    titleKey: "settings.items.code-font.title",
    to: "/settings/appearance",
    searchTerms: ["typography family size monospace code blocks diffs file previews"],
  },
  {
    id: "terminal-font",
    titleKey: "settings.items.terminal-font.title",
    to: "/settings/appearance",
    searchTerms: ["typography family size monospace output"],
  },
  {
    id: "separate-fonts",
    titleKey: "settings.items.separate-fonts.title",
    to: "/settings/appearance",
    searchTerms: ["typography advanced prompt code terminal font family size individually"],
  },
  {
    id: "font-smoothing",
    titleKey: "settings.items.font-smoothing.title",
    to: "/settings/appearance",
    searchTerms: ["typography text grayscale anti aliasing macos thin"],
    macOnly: true,
  },
  {
    id: "word-wrap",
    titleKey: "settings.items.word-wrap.title",
    to: "/settings/appearance",
    searchTerms: ["long lines code blocks diffs file previews"],
  },
  {
    id: "composer-context",
    titleKey: "settings.items.composer-context.title",
    to: "/settings/appearance",
  },
  {
    id: "project-grouping",
    titleKey: "settings.items.project-grouping.title",
    to: "/settings/general",
    searchTerms: ["combine matching repositories environments sidebar"],
  },
  {
    id: "project-order",
    titleKey: "settings.items.project-order.title",
    to: "/settings/general",
    searchTerms: ["sort projects sidebar manual created recent"],
  },
  {
    id: "snooze-options",
    titleKey: "settings.items.snooze-options.title",
    to: "/settings/threads",
    searchTerms: ["snooze presets times later tonight tomorrow next week remind"],
    environmentOnly: true,
    scope: "environment-defaults",
  },
  {
    id: "snooze-limited-threads",
    titleKey: "settings.items.snooze-limited-threads.title",
    to: "/settings/threads",
    searchTerms: ["usage quota rate limit reset wake recover continue"],
  },
  {
    id: "auto-resume-limited-threads",
    titleKey: "settings.items.auto-resume-limited-threads.title",
    to: "/settings/threads",
    searchTerms: ["usage quota rate limit reset recover continue"],
  },
  {
    id: "working-shelf",
    titleKey: "settings.items.working-shelf.title",
    to: "/settings/general",
    searchTerms: ["hide fold running monitoring threads inbox sidebar shelf"],
  },
  {
    id: "boring-sidebar",
    titleKey: "settings.items.boring-sidebar.title",
    to: "/settings/labs",
    searchTerms: ["beta folders project tree legacy old classic sidebar"],
  },
  {
    id: "boring-sidebar-multiline",
    title: "Two-line folder rows",
    to: "/settings/labs",
    searchTerms: ["beta boring sidebar folder rows multiline branch pull request details"],
  },
  {
    id: "guest-links",
    titleKey: "settings.items.guest-links.title",
    to: "/settings/labs",
    scope: "environment",
    searchTerms: ["beta share guest invite link teammate watch t3 connect tunnel"],
  },
  {
    id: "linked-environments-beta",
    titleKey: "settings.items.linked-environments-beta.title",
    to: "/settings/labs",
    scope: "environment",
    searchTerms: ["beta link another machine vps peer agents work there delegate"],
  },
  {
    id: "simlock-hosts",
    title: "Simlock device hosts (alpha)",
    to: "/settings/labs",
    scope: "environment",
    searchTerms: ["beta alpha simlock callstack simulator emulator ios android pool lease gateway"],
  },
  {
    id: "auto-settle-inactive-threads",
    titleKey: "settings.items.auto-settle-inactive-threads.title",
    to: "/settings/threads",
    searchTerms: ["sidebar inactivity days no activity automatically"],
    requiresThreadAutoSettlement: true,
    scope: "project-defaults",
  },
  {
    id: "compact-idle-threads",
    titleKey: "settings.items.compact-idle-threads.title",
    to: "/settings/providers",
    scope: "environment-defaults",
    searchTerms: ["claude context compaction idle cache tokens usage summary resume"],
  },
  {
    id: "auto-settle-merged-threads",
    titleKey: "settings.items.auto-settle-merged-threads.title",
    to: "/settings/threads",
    searchTerms: ["pull request merge closed automatically sidebar"],
    requiresThreadAutoSettlement: true,
    scope: "project-defaults",
  },
  {
    id: "keep-threads-with-pull-requests",
    titleKey: "settings.items.keep-threads-with-pull-requests.title",
    to: "/settings/threads",
    targetId: "auto-settle-inactive-threads",
    searchTerms: ["pull request inactivity auto-settle merge close sidebar"],
    requiresThreadAutoSettlement: true,
    scope: "project-defaults",
  },
  {
    id: "days-before-auto-settle",
    titleKey: "settings.items.days-before-auto-settle.title",
    to: "/settings/threads",
    targetId: "auto-settle-inactive-threads",
    searchTerms: ["thread timeout activity sidebar"],
    requiresThreadAutoSettlement: true,
    scope: "project-defaults",
  },
  {
    id: "thread-notifications",
    titleKey: "settings.items.thread-notifications.title",
    to: "/settings/general",
    searchTerms: ["notification sound alert completion input approval desktop"],
  },
  {
    id: "in-app-notifications",
    titleKey: "settings.items.in-app-notifications.title",
    to: "/settings/general",
    searchTerms: ["notification toast popup completion input approval failure"],
  },
  {
    id: "time-format",
    titleKey: "settings.items.time-format.title",
    to: "/settings/general",
    searchTerms: ["timestamp clock locale system browser os 12 hour 24 hour"],
  },
  {
    id: "response-streaming",
    titleKey: "settings.items.response-streaming.title",
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: ["output token paragraph buffered wait turn legacy"],
  },
  {
    id: "hide-whitespace-changes",
    titleKey: "settings.items.hide-whitespace-changes.title",
    to: "/settings/diffs",
    searchTerms: ["diff ignore spaces edits default"],
  },
  {
    id: "default-diff-file-state",
    titleKey: "settings.items.default-diff-file-state.title",
    to: "/settings/diffs",
    searchTerms: ["collapsed expanded collapse expand files pull request pr code tab"],
  },
  {
    id: "diff-layout",
    titleKey: "settings.items.diff-layout.title",
    to: "/settings/diffs",
    searchTerms: ["stacked split side by side unified inline view"],
  },
  {
    id: "proactive-panels",
    titleKey: "settings.items.proactive-panels.title",
    to: "/settings/diffs",
    searchTerms: ["automatically open diff pull request pr right panel agent completion"],
  },
  {
    id: "skills-in-slash-menu",
    titleKey: "settings.items.skills-in-slash-menu.title",
    to: "/settings/chat",
    searchTerms: ["command menu dollar $ slash /"],
  },
  {
    id: "composer-rich-text",
    titleKey: "settings.items.composer-rich-text.title",
    to: "/settings/chat",
    searchTerms: ["composer rich text tiptap bold italic markdown styled wysiwyg"],
  },
  {
    id: "send-shortcut",
    titleKey: "settings.items.send-shortcut.title",
    to: "/settings/chat",
    searchTerms: ["enter return command ctrl multiline prompt new line composer"],
  },
  {
    id: "follow-up-behavior",
    titleKey: "settings.items.follow-up-behavior.title",
    to: "/settings/chat",
    searchTerms: ["queue steer running turn send default behavior composer"],
  },
  {
    id: "provider-update-checks",
    titleKey: "settings.items.provider-update-checks.title",
    to: "/settings/maintenance",
    searchTerms: ["installed cli versions newer available codex claude cursor grok fx opencode"],
    scope: "environment-defaults",
  },
  {
    id: "continue-threads-after-server-update",
    titleKey: "settings.items.continue-threads-after-server-update.title",
    to: "/settings/maintenance",
    scope: "project-defaults",
    searchTerms: [
      "resume running active interrupted work restart reboot machine crash desktop update automatically",
    ],
  },
  {
    id: "background-activity",
    titleKey: "settings.items.background-activity.title",
    to: "/settings/maintenance",
    scope: "environment-defaults",
    searchTerms: [
      "balanced performance battery saver advanced git fetch provider health refresh host power monitor idle policy",
    ],
  },
  {
    id: "new-threads",
    titleKey: "settings.items.new-threads.title",
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: ["default workspace mode draft local worktree"],
  },
  {
    id: "worktree-submodules",
    titleKey: "settings.items.worktree-submodules.title",
    to: "/settings/worktrees",
    scope: "project-defaults",
    searchTerms: ["git submodule init recursive top-level none worktree t3.json"],
  },
  {
    id: "start-from-origin",
    titleKey: "settings.items.start-from-origin.title",
    to: "/settings/worktrees",
    scope: "project-defaults",
    searchTerms: ["new worktrees start remote origin latest fetched branch local"],
  },
  {
    id: "add-project-starts-in",
    titleKey: "settings.items.add-project-starts-in.title",
    to: "/settings/threads",
    scope: "environment-defaults",
    searchTerms: ["base directory folder browser path home"],
  },
  {
    id: "unpin-confirmation",
    titleKey: "settings.items.unpin-confirmation.title",
    to: "/settings/general",
    searchTerms: ["ask before thread pinned section"],
  },
  {
    id: "archive-confirmation",
    titleKey: "settings.items.archive-confirmation.title",
    to: "/settings/general",
    searchTerms: ["ask before thread second click inline action"],
  },
  {
    id: "delete-confirmation",
    titleKey: "settings.items.delete-confirmation.title",
    to: "/settings/general",
    searchTerms: ["ask before thread chat history"],
  },
  {
    id: "quit-confirmation",
    titleKey: "settings.items.quit-confirmation.title",
    to: "/settings/general",
    searchTerms: ["confirmation desktop app exit direct hold double click press twice"],
    desktopOnly: true,
  },
  {
    id: "text-generation-model",
    titleKey: "settings.items.text-generation-model.title",
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: ["generated thread titles source control content default provider"],
  },
  {
    id: "thread-title-instructions",
    titleKey: "settings.items.thread-title-instructions.title",
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: ["generated thread titles prompt custom style naming rename regenerate"],
  },
  {
    id: "app-version",
    titleKey: "settings.items.app-version.title",
    to: "/settings/about",
    searchTerms: ["about check for updates download install upgrade release"],
  },
  {
    id: "update-track",
    titleKey: "settings.items.update-track.title",
    to: "/settings/about",
    searchTerms: ["release channel stable latest nightly prerelease"],
    releaseChannelOnly: true,
  },
  {
    id: "cli-command",
    titleKey: "settings.items.cli-command.title",
    to: "/settings/about",
    searchTerms: ["cli terminal shell path install command line"],
    desktopOnly: true,
  },
  {
    id: "mobile-app",
    titleKey: "settings.items.mobile-app.title",
    to: "/settings/about",
    searchTerms: ["phone tablet iPhone iPad iOS Android App Store Google Play QR"],
  },
  {
    id: "privacy-policy",
    titleKey: "settings.items.privacy-policy.title",
    to: "/settings/about",
    searchTerms: ["telemetry analytics usage data tracking legal opt out"],
  },
  {
    id: "telemetry-export",
    titleKey: "settings.items.telemetry-export.title",
    to: "/settings/diagnostics",
    targetId: "telemetry-export",
    scope: "environment",
    searchTerms: ["OTel OTLP telemetry export endpoints logs traces metrics Grafana"],
  },
  {
    id: "diagnostics",
    titleKey: "settings.items.diagnostics.title",
    to: "/settings/maintenance",
    searchTerms: ["logs traces processes resource history failures spans cpu memory"],
  },
  {
    id: "open-source-licenses",
    titleKey: "settings.items.open-source-licenses.title",
    to: "/settings/about",
  },
  {
    id: "legacy-plan-mode",
    titleKey: "settings.items.legacy-plan-mode.title",
    to: "/settings/labs",
    searchTerms: ["build plan composer old"],
  },
  {
    id: "legacy-context-window-indicator",
    titleKey: "settings.items.legacy-context-window-indicator.title",
    to: "/settings/labs",
    searchTerms: ["composer meter usage tokens circle old"],
  },
  {
    id: "keybindings",
    titleKey: "settings.items.keybindings.title",
    to: "/settings/keybindings",
    searchTerms: ["keyboard shortcuts hotkeys commands bindings json"],
  },
  ...KEYBINDING_SEARCH_ITEMS,
  {
    id: "snap-shot-enabled",
    titleKey: "settings.items.snap-shot-enabled.title",
    searchTerms: ["window capture screenshot"],
    to: "/settings/snap-shot",
  },
  {
    id: "snap-shot-accessibility",
    titleKey: "settings.items.snap-shot-accessibility.title",
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
    searchTerms: [
      "capture accessibility data text UI structure elements privacy omit agent context",
    ],
  },
  {
    id: "snap-shot-shortcut",
    titleKey: "settings.items.snap-shot-shortcut.title",
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
  },
  {
    id: "snap-shot-sound",
    titleKey: "settings.items.snap-shot-sound.title",
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
  },
  {
    id: "snap-shot-flash",
    titleKey: "settings.items.snap-shot-flash.title",
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
  },
  {
    id: "snap-shot-animations",
    titleKey: "settings.items.snap-shot-animations.title",
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
  },
  {
    id: "providers",
    titleKey: "settings.items.providers.title",
    to: "/settings/providers",
    searchTerms: [
      "agents cli codex claude cursor grok fx opencode antigravity google sign in sign out install subscription instances authentication api key models configuration binary path config directory endpoint arguments environment variables display name accent color custom favorite hidden auto compact",
    ],
  },
  {
    id: "usage-providers",
    titleKey: "settings.items.usage-providers.title",
    to: "/settings/providers",
    searchTerms: [
      "usage sources CLIProxyAPI CLI proxy hub quota subscription limits management key add remove",
    ],
    providerSettingsOnly: true,
  },
  {
    id: "cursor-keychain-usage",
    titleKey: "settings.items.cursor-keychain-usage.title",
    to: "/settings/providers",
    searchTerms: ["cursor macOS keychain usage tokens cost limits permission"],
    providerSettingsOnly: true,
    macProviderSettingsOnly: true,
  },
  {
    id: "provider-health-check-interval",
    titleKey: "settings.items.provider-health-check-interval.title",
    to: "/settings/providers",
    searchTerms: ["refresh availability versions auth state models background probes seconds off"],
    providerSettingsOnly: true,
  },
  {
    id: "agent-browser-access",
    titleKey: "settings.items.agent-browser-access.title",
    to: "/settings/browser",
    scope: "project-defaults",
    searchTerms: ["allow disable enable open drive preview tools sessions project override"],
  },
  {
    id: "device-sources",
    titleKey: "nightly.DeviceSourcesSettings.device-sources",
    to: "/settings/devices",
    searchTerms: [
      "device hosts ssh remote mac mini identity key connection eas expo cloud simlock pool gateway local simulators",
    ],
  },
  {
    id: "agent-device-access",
    titleKey: "settings.items.agent-device-access.title",
    to: "/settings/devices",
    targetId: "devices",
    searchTerms: ["allow simulator emulator ios android drive tools sessions"],
  },
  {
    id: "device-hub",
    titleKey: "settings.items.device-hub.title",
    to: "/settings/devices",
    targetId: "devices",
    searchTerms: ["device hub simulator emulator ios android install start version"],
  },
  {
    id: "device-platform-support",
    titleKey: "settings.items.device-platform-support.title",
    to: "/settings/devices",
    targetId: "device-sources",
    searchTerms: ["simulator support xcode android studio sdk avd runtime"],
  },
  {
    id: "browser-profiles",
    titleKey: "settings.items.browser-profiles.title",
    to: "/settings/browser",
    targetId: "browser",
  },
  {
    id: "browser-default-profile",
    titleKey: "settings.items.browser-default-profile.title",
    to: "/settings/browser",
    targetId: "browser-profiles",
  },
  {
    id: "browser-default-viewport",
    titleKey: "settings.items.browser-default-viewport.title",
    to: "/settings/browser",
    searchTerms: ["preview size width height device desktop mobile rotate"],
  },
  {
    id: "browser-default-zoom",
    titleKey: "settings.items.browser-default-zoom.title",
    to: "/settings/browser",
    searchTerms: ["preview page scale tabs percent"],
  },
  {
    id: "browser-default-appearance",
    titleKey: "settings.items.browser-default-appearance.title",
    to: "/settings/browser",
    searchTerms: ["preview color scheme light dark system os"],
  },
  {
    id: "browser-recording-frame-rate",
    titleKey: "settings.items.browser-recording-frame-rate.title",
    to: "/settings/browser",
  },
  {
    id: "browser-recording-key-presses",
    titleKey: "settings.items.browser-recording-key-presses.title",
    to: "/settings/browser",
    searchTerms: ["browser preview keyboard shortcuts keystrokes overlay capture"],
  },
  {
    id: "browser-recording-mouse-presses",
    titleKey: "settings.items.browser-recording-mouse-presses.title",
    to: "/settings/browser",
    searchTerms: ["browser preview clicks buttons drag overlay capture"],
  },
  {
    id: "browser-link-target",
    titleKey: "settings.items.browser-link-target.title",
    to: "/settings/browser",
    searchTerms: ["links default browser in-app browser external open"],
  },
  {
    id: "browser-search-engine",
    titleKey: "settings.items.browser-search-engine.title",
    to: "/settings/browser",
    searchTerms: ["address bar duckduckgo google bing brave kagi ecosia custom"],
  },
  {
    id: "pull-request-links-open-in-app",
    titleKey: "settings.items.pull-request-links-open-in-app.title",
    to: "/settings/diffs",
    searchTerms: [
      `pr links ${SOURCE_CONTROL_HOST_LABELS} browser external click default pull request view panel`,
    ],
  },
  {
    id: "browser-auto-show-floating-preview",
    titleKey: "settings.items.browser-auto-show-floating-preview.title",
    to: "/settings/browser",
    searchTerms: ["agent opens browser device simulator pop into view hide"],
  },
  {
    id: "automatic-pull",
    titleKey: "settings.items.automatic-pull.title",
    to: "/settings/source-control",
    scope: "project-defaults",
    searchTerms: ["auto pull default branch current checkout fast forward upstream"],
  },
  {
    id: "remove-agent-credits-on-merge",
    titleKey: "settings.items.remove-agent-credits-on-merge.title",
    to: "/settings/source-control",
    scope: "project-defaults",
    searchTerms: [
      `pull request ${SOURCE_CONTROL_HOST_LABELS} squash co-authored-by attribution claude codex generated`,
    ],
  },
  {
    id: "pull-request-merge-method",
    titleKey: "settings.items.pull-request-merge-method.title",
    to: "/settings/source-control",
    scope: "project-defaults",
    searchTerms: ["pull request merge squash rebase last selected"],
  },
  {
    id: "source-control",
    titleKey: "settings.items.source-control.title",
    to: "/settings/source-control",
    scope: "environment-defaults",
    searchTerms: [
      `version control git ${SOURCE_CONTROL_HOST_TERMS} hosting integrations credentials scan server environment`,
    ],
  },
  {
    id: "git-fetch-interval",
    titleKey: "settings.items.git-fetch-interval.title",
    to: "/settings/maintenance",
    targetId: "background-activity",
    searchTerms: [
      "automatic remote branch refresh background credentials security keys seconds off",
    ],
    environmentOnly: true,
    scope: "environment-defaults",
  },
  {
    id: "worktree-branch-naming",
    titleKey: "settings.items.worktree-branch-naming.title",
    to: "/settings/worktrees",
    searchTerms: ["static semantic prefix custom prompt instructions feat fix refactor chore"],
    environmentOnly: true,
    scope: "project-defaults",
  },
  ...sourceControlHostSearchItems(sourceControlClients.definitions),
  {
    id: "source-control-writing-style",
    titleKey: "settings.items.source-control-writing-style.title",
    to: "/settings/source-control",
    searchTerms: [
      "repository conventions conventional commits custom instructions change descriptions request titles",
    ],
    environmentOnly: true,
  },
  {
    id: "follow-change-request-templates",
    titleKey: "settings.items.follow-change-request-templates.title",
    to: "/settings/source-control",
    searchTerms: ["repository pr pull request description structure"],
    environmentOnly: true,
  },
  {
    id: "source-control-writer-model",
    titleKey: "settings.items.source-control-writer-model.title",
    to: "/settings/source-control",
    searchTerms: [
      "override generated commit change request pr titles descriptions branch bookmark",
    ],
    environmentOnly: true,
    scope: "project-defaults",
  },
  {
    id: "review-guides",
    titleKey: "settings.items.review-guides.title",
    to: "/settings/source-control",
    searchTerms: ["pull request pr guided review guide tour beta experimental"],
    environmentOnly: true,
  },
  {
    id: "review-guide-model",
    titleKey: "settings.items.review-guide-model.title",
    to: "/settings/source-control",
    // Hidden until review guides are on, so a search lands on the switch that shows it.
    targetId: "review-guides",
    searchTerms: ["pull request pr guided review guide brief maintainer"],
    environmentOnly: true,
    scope: "project-defaults",
  },
  {
    id: "review-guide-instructions",
    titleKey: "settings.items.review-guide-instructions.title",
    to: "/settings/source-control",
    targetId: "review-guides",
    searchTerms: ["pull request pr guided review guide preferences taste prompt custom"],
    environmentOnly: true,
    scope: "project-defaults",
  },
  {
    id: "project-actions",
    titleKey: "settings.items.project-actions.title",
    to: "/settings/projects",
    searchTerms: ["commands scripts setup run dev server checkout worktree t3.json import"],
  },
  {
    id: "environment-icon",
    titleKey: "settings.items.environment-icon.title",
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: ["machine glyph sidebar mac mini studio laptop desktop server cloud vm"],
  },
  {
    id: "local-environment",
    titleKey: "settings.items.local-environment.title",
    to: "/settings/connections",
    searchTerms: ["turn off on disable enable local server agents remote only restart"],
    desktopOnly: true,
  },
  {
    id: "network-access",
    titleKey: "settings.items.network-access.title",
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: ["expose backend remote pairing local machine interfaces host restart"],
    localBackendManagementOnly: true,
  },
  {
    id: "tailscale-https",
    titleKey: "settings.items.tailscale-https.title",
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: ["serve magicdns endpoint remote secure network"],
    desktopOnly: true,
    localBackendManagementOnly: true,
  },
  {
    id: "wsl-backend",
    titleKey: "settings.items.wsl-backend.title",
    to: "/settings/access",
    searchTerms: [
      "windows subsystem linux distro second server projects stop windows backend restart",
    ],
    desktopOnly: true,
    windowsOnly: true,
    localBackendManagementOnly: true,
    wslAvailableOnly: true,
  },
  {
    id: "t3-connect",
    localEnvironmentOnly: true,
    titleKey: "settings.items.t3-connect.title",
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: ["managed tunnel cloud other devices remote tunnels limit t3 chat"],
    desktopOnly: true,
    cloudOnly: true,
  },
  {
    id: "hold-webhooks-while-offline",
    localEnvironmentOnly: true,
    titleKey: "settings.items.hold-webhooks-while-offline.title",
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: ["webhook automations offline queue mailbox t3 connect"],
    cloudOnly: true,
    managedTunnelOnly: true,
  },
  {
    id: "publish-agent-activity",
    localEnvironmentOnly: true,
    titleKey: "settings.items.publish-agent-activity.title",
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: ["mobile push notifications live activities cloud tunnel"],
    cloudOnly: true,
  },
  {
    id: "connections-environment",
    titleKey: "settings.items.connections-environment.title",
    to: "/settings/access",
    searchTerms: [
      "connections server backend local remote access administrative permissions scope pairing links qr code authorized clients sessions revoke endpoint",
    ],
  },
  {
    id: "linked-environments",
    peerLinksOnly: true,
    titleKey: "settings.items.linked-environments.title",
    to: "/settings/connections",
    targetId: "linked-environments",
    searchTerms: ["link peer another machine vps agents work there handoff pairing code"],
  },
  {
    id: "remote-environments",
    titleKey: "settings.items.remote-environments.title",
    to: "/settings/connections",
    searchTerms: ["add pair backend host code ssh config agent tunnel saved t3 connect"],
  },
  {
    id: "load-balancing",
    titleKey: "settings.items.load-balancing.title",
    to: "/settings/connections",
    searchTerms: [
      "automatic machine environment resources cpu memory capacity preference weight shared projects",
    ],
  },
  {
    id: "pull-request-routing",
    titleKey: "settings.items.pull-request-routing.title",
    to: "/settings/connections",
    searchTerms: [
      `pull request routing trusted environments shared credentials permissions read actions source control ${SOURCE_CONTROL_HOST_LABELS}`,
    ],
  },
  {
    id: "archive",
    titleKey: "settings.items.archive.title",
    to: "/settings/archived",
    searchTerms: ["restore reopen deleted history projects"],
  },
] as const satisfies ReadonlyArray<
  Omit<SettingsSearchItem, "title"> & ({ title: string } | { titleKey: TranslationKey })
>;

export const SETTINGS_SEARCH_ITEMS = SETTINGS_SEARCH_DEFINITIONS.map((item) => ({
  ...item,
  title: "titleKey" in item ? resources.en.translation[item.titleKey] : item.title,
}));

export type SettingsSearchItemId = (typeof SETTINGS_SEARCH_ITEMS)[number]["id"];

const SEARCH_ITEMS_BY_ID = new Map(SETTINGS_SEARCH_ITEMS.map((item) => [item.id, item] as const));

const SETTINGS_CATEGORY_SCOPES: Readonly<Record<SettingsPath, SettingsSearchScope | null>> = {
  "/settings/diagnostics": "environment",
  "/settings/projects": "project",
  "/settings/general": null,
  "/settings/appearance": null,
  "/settings/chat": null,
  "/settings/diffs": null,
  "/settings/snap-shot": null,
  "/settings/keybindings": null,
  "/settings/providers": null,
  "/settings/threads": null,
  "/settings/browser": null,
  "/settings/devices": null,
  "/settings/source-control": "environment-defaults",
  "/settings/worktrees": "project-defaults",
  "/settings/connections": "connections",
  "/settings/access": "connections",
  "/settings/scheduled-tasks": null,
  "/settings/maintenance": null,
  "/settings/labs": null,
  "/settings/about": null,
  "/settings/archived": "project-defaults",
};

const RENAMED_SETTINGS_PATHS: Readonly<Record<string, SettingsPath>> = {
  "/settings/integrations": "/settings/browser",
  "/settings/storage": "/settings/maintenance",
  "/settings/beta": "/settings/labs",
};
const SPLIT_SETTINGS_PATHS: ReadonlySet<string> = new Set([
  "/settings/general",
  "/settings/appearance",
  "/settings/source-control",
  "/settings/connections",
  ...Object.keys(RENAMED_SETTINGS_PATHS),
]);
// Section anchors that moved but are not search results themselves.
const MOVED_SECTION_ANCHORS: Readonly<Record<string, SettingsPath>> = {
  "authorized-clients": "/settings/access",
  "legacy-features": "/settings/labs",
  "text-generation": "/settings/threads",
  about: "/settings/about",
};

/** Where an old settings link now lives. Its anchor finds the page its row moved to. */
export function movedSettingsPath(pathname: string, hash: string): SettingsPath | null {
  if (!SPLIT_SETTINGS_PATHS.has(pathname)) return null;
  const items: readonly SettingsSearchItem[] = SETTINGS_SEARCH_ITEMS;
  const anchored = hash
    ? (items.find((item) => item.id === hash) ?? items.find((item) => item.targetId === hash))
    : undefined;
  const to =
    anchored?.to ?? MOVED_SECTION_ANCHORS[hash] ?? RENAMED_SETTINGS_PATHS[pathname] ?? null;
  return to === pathname ? null : to;
}

export function getSettingsSearchTargetScope(targetId: string, t?: TFunction) {
  const items: readonly SettingsSearchItem[] = SETTINGS_SEARCH_ITEMS;
  const item =
    items.find((candidate) => candidate.id === targetId) ??
    items.find((candidate) => candidate.targetId === targetId);
  return item
    ? {
        title: item.titleKey && t ? t(item.titleKey) : item.title,
        scope: item.scope ?? SETTINGS_CATEGORY_SCOPES[item.to],
        ...(item.requiresThreadAutoSettlement ? { requiresThreadAutoSettlement: true } : {}),
      }
    : null;
}

interface AutoSettlementSearchEnvironment {
  readonly environmentId: EnvironmentId;
  readonly connection: { readonly phase: EnvironmentConnectionPhase };
  readonly serverConfig: object | null;
}

export function getThreadAutoSettlementSearchAvailability(
  environments: readonly AutoSettlementSearchEnvironment[],
  scope?: Pick<ResolvedSettingsScope, "kind" | "environmentIds">,
) {
  const connected = environments.filter(
    (environment) =>
      environment.connection.phase === "connected" && environment.serverConfig !== null,
  );
  const eligibleEnvironmentIds = connected.map((environment) => environment.environmentId);
  const selected = connected.filter((environment) =>
    scope?.environmentIds.includes(environment.environmentId),
  );
  return {
    eligibleEnvironmentIds,
    isTargetAvailable:
      scope !== undefined &&
      scope.kind !== "unavailable" &&
      selected.length > 0 &&
      selected.every((environment) => eligibleEnvironmentIds.includes(environment.environmentId)),
  };
}

export function isSettingsSearchScopeAvailable(
  requiredScope: SettingsSearchScope | null,
  scopeKind: ResolvedSettingsScope["kind"],
): boolean {
  switch (requiredScope) {
    case null:
    case "connections":
      return true;
    case "environment":
    case "checkout":
      return requiredScope === scopeKind;
    case "project":
      return scopeKind === "project" || scopeKind === "checkout";
    case "environment-defaults":
      return scopeKind === "environment" || scopeKind === "all";
    case "project-defaults":
      return (
        scopeKind === "environment" ||
        scopeKind === "all" ||
        scopeKind === "project" ||
        scopeKind === "checkout"
      );
  }
}

type SearchableSetting = { readonly id: string } & (
  | { readonly title: string; readonly titleKey?: never }
  | { readonly title?: never; readonly titleKey: TranslationKey }
);
export function searchableSetting(
  id: SettingsSearchItemId,
  t: TFunction,
): { readonly id: string; readonly title: string };
export function searchableSetting(id: SettingsSearchItemId): SearchableSetting;
export function searchableSetting(id: SettingsSearchItemId, t?: TFunction): SearchableSetting {
  const item = SEARCH_ITEMS_BY_ID.get(id)!;
  if ("titleKey" in item && item.titleKey) {
    return t ? { id: item.id, title: t(item.titleKey) } : { id: item.id, titleKey: item.titleKey };
  }
  return { id: item.id, title: item.title };
}

export function filterAvailableSettingsSearchItems(
  availability: SettingsSearchAvailability,
): ReadonlyArray<SettingsSearchItem> {
  const items: ReadonlyArray<SettingsSearchItem> = SETTINGS_SEARCH_ITEMS;
  return items.filter(
    (item) =>
      (!item.cloudOnly || availability.hasCloudPublicConfig) &&
      (!item.environmentOnly || availability.hasEnvironment) &&
      (!item.providerSettingsOnly || availability.hasProviderSettingsEnvironment) &&
      (!item.macProviderSettingsOnly || availability.hasMacProviderSettingsEnvironment) &&
      (!item.localBackendManagementOnly || availability.canManageLocalBackend) &&
      (!item.localEnvironmentOnly || !availability.localEnvironmentDisabled) &&
      (!item.wslAvailableOnly || availability.isWslSettingsRowVisible) &&
      (!item.requiresThreadAutoSettlement || availability.hasThreadAutoSettlement) &&
      (!item.managedTunnelOnly || availability.managedTunnelActive === true) &&
      (!item.peerLinksOnly || availability.hasPeerLinkHost === true),
  );
}

/** The settings that exist on this platform and app channel. */
export function settingsForThisPlatform(
  items: ReadonlyArray<SettingsSearchItem>,
): ReadonlyArray<SettingsSearchItem> {
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  return items.filter(
    (item) =>
      (isElectron || item.desktopOnly !== true) &&
      (!item.releaseChannelOnly || isElectron || HOSTED_APP_CHANNEL !== null) &&
      (!item.macOnly || isMacPlatform(platform)) &&
      (!item.windowsOnly || isWindowsPlatform(platform)),
  );
}

export function searchSettings(
  query: string,
  items: ReadonlyArray<SettingsSearchItem> = SETTINGS_SEARCH_ITEMS,
): ReadonlyArray<SettingsSearchItem> {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return [];
  const queryTokens = normalizedQuery.split(" ");

  return settingsForThisPlatform(items)
    .flatMap((item, index) => {
      const title = normalizeSearchText(item.title);
      const fields = [
        title,
        normalizeSearchText(SETTINGS_SECTION_LABELS[item.to]),
        ...(item.searchTerms ?? []).map(normalizeSearchText),
      ];
      if (!queryTokens.every((token) => fields.some((field) => field.includes(token)))) return [];

      const exactPhraseField = fields.findIndex((field) => field.includes(normalizedQuery));
      const rank =
        title === normalizedQuery
          ? 5
          : title.startsWith(normalizedQuery)
            ? 4
            : title.includes(normalizedQuery)
              ? 3
              : queryTokens.every((token) => title.includes(token))
                ? 2
                : exactPhraseField >= 0
                  ? 1
                  : 0;
      return [{ item, index, rank }];
    })
    .toSorted(
      (left, right) =>
        Number(left.item.secondary ?? false) - Number(right.item.secondary ?? false) ||
        right.rank - left.rank ||
        left.index - right.index,
    )
    .map(({ item }) => item);
}

// These rows only exist with separate fonts on, so a search jump to one turns them on.
const ADVANCED_TYPOGRAPHY_TARGET_IDS: ReadonlySet<string> = new Set([
  "prompt-font",
  "terminal-font",
]);

export function isAdvancedTypographyTarget(targetId: string): boolean {
  return ADVANCED_TYPOGRAPHY_TARGET_IDS.has(targetId);
}

/**
 * Opens the persisted section a search result lives in before jumping to it, so
 * its row is mounted to scroll to. The terminal reads the same flag, so it must
 * stay on after the jump.
 */
export function revealSettingsSearchTarget(targetId: string): void {
  if (isAdvancedTypographyTarget(targetId)) {
    writeLocalStorageValue(TYPOGRAPHY_ADVANCED_STORAGE_KEY, true, false, Schema.Boolean);
  }
}
