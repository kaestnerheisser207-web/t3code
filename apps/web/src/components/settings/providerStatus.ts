import type { TFunction } from "i18next";
import type {
  ServerProvider,
  ServerProviderVersionAdvisory,
  ServerProviderCompatibilityAdvisory,
} from "@t3tools/contracts";

export const PROVIDER_STATUS_STYLES = {
  disabled: {
    dot: "bg-muted-foreground/50",
  },
  error: {
    dot: "bg-destructive",
  },
  neutral: {
    dot: "bg-muted-foreground",
  },
  ready: {
    dot: "bg-success",
  },
  warning: {
    dot: "bg-warning",
  },
} as const;

export type ProviderStatusKey = keyof typeof PROVIDER_STATUS_STYLES;

// Antigravity's local health check verifies installation, not Google sign-in.
// API-key and Agent Platform warnings still need attention.
function isAntigravitySignInUnchecked(provider: ServerProvider): boolean {
  return (
    provider.driver === "antigravity" &&
    provider.installed &&
    provider.status === "warning" &&
    provider.auth.status === "unknown" &&
    (provider.auth.type === undefined ||
      provider.auth.type === "oauth-personal" ||
      provider.auth.type === "oauth-business")
  );
}

export function getProviderStatusKey(provider: ServerProvider | undefined): ProviderStatusKey {
  if (provider && !provider.enabled) return "disabled";
  if (provider && isAntigravitySignInUnchecked(provider)) return "neutral";
  return provider?.status ?? "warning";
}

export function getProviderSummary(provider: ServerProvider | undefined, t?: TFunction) {
  if (!provider) {
    return {
      headline: t?.("provider.summary.checking") ?? "Checking provider status",
      detail:
        t?.("provider.summary.waiting") ??
        "Waiting for the server to report installation and authentication details.",
    };
  }
  if (!provider.enabled || provider.status === "disabled") {
    return {
      headline: t?.("nativeMenu.disabled") ?? "Disabled",
      detail:
        provider.message ??
        t?.("provider.summary.disabledDetail") ??
        "This provider is installed but disabled for new sessions in T3 Code.",
    };
  }
  if (!provider.installed) {
    return {
      headline: t?.("provider.summary.notFound") ?? "Not found",
      detail: provider.message ?? t?.("provider.summary.noCli") ?? "CLI not detected on PATH.",
    };
  }
  if (provider.auth.status === "unauthenticated") {
    const authLabel = provider.auth.label ?? provider.auth.type;
    return {
      headline: authLabel
        ? (t?.("provider.summary.unauthenticatedType", { type: authLabel }) ??
          `Not authenticated · ${authLabel}`)
        : (t?.("provider.summary.unauthenticated") ?? "Not authenticated"),
      detail: provider.message ?? null,
    };
  }
  if (isAntigravitySignInUnchecked(provider)) {
    return {
      headline: t?.("provider.summary.unchecked") ?? "Installed · Sign-in not checked",
      detail: provider.message ?? null,
    };
  }
  if (provider.status === "warning") {
    return {
      headline: t?.("provider.summary.attention") ?? "Needs attention",
      detail:
        provider.message ??
        t?.("provider.summary.unverified") ??
        "The provider is installed, but the server could not fully verify it.",
    };
  }
  if (provider.status === "error") {
    return {
      headline: t?.("telemetry.unavailable") ?? "Unavailable",
      detail:
        provider.message ??
        t?.("provider.summary.startupFailed") ??
        "The provider failed its startup checks.",
    };
  }
  if (provider.auth.status === "authenticated") {
    const authLabel = provider.auth.label ?? provider.auth.type;
    return {
      headline: authLabel
        ? (t?.("provider.summary.authenticatedType", { type: authLabel }) ??
          `Authenticated · ${authLabel}`)
        : (t?.("provider.summary.authenticated") ?? "Authenticated"),
      detail: provider.message ?? null,
    };
  }
  return {
    headline: t?.("connection.available") ?? "Available",
    detail: provider.message ?? null,
  };
}

export function getProviderVersionLabel(version: string | null | undefined) {
  if (!version) return null;
  const antigravity = /^agy_acp_server_(\d{4})(\d{2})(\d{2})_\d+(?:_(\w+))?$/.exec(version);
  if (antigravity) {
    const [, year, month, day, candidate] = antigravity;
    return `${year}-${month}-${day}${candidate ? ` ${candidate}` : ""}`;
  }
  return /^\d/.test(version) ? `v${version}` : version;
}

const COMPATIBILITY_TITLES = {
  graceful: "settings.status.limited",
  unsupported: "provider.summary.unsupportedVersion",
  broken: "provider.summary.brokenVersion",
} as const;
const COMPATIBILITY_ENGLISH = {
  graceful: "Limited support",
  unsupported: "Unsupported version",
  broken: "Known broken version",
} as const;

export function getProviderVersionAdvisoryPresentation(
  advisory: ServerProviderVersionAdvisory | undefined,
  compatibility?: ServerProviderCompatibilityAdvisory | undefined,
  showCompatibility = true,
  t?: TFunction,
): {
  readonly title: string;
  readonly detail: string;
  readonly updateCommand: string | null;
  readonly emphasis: "normal" | "strong";
  readonly targetVersion: string | null;
} | null {
  const latestIsIncompatible =
    compatibility?.latestVersionStatus === "broken" ||
    compatibility?.latestVersionStatus === "unsupported";
  if (
    showCompatibility &&
    compatibility &&
    (compatibility.status === "graceful" ||
      compatibility.status === "unsupported" ||
      compatibility.status === "broken")
  ) {
    const targetVersion = compatibility.recommendedVersion;
    const recommendation = getProviderVersionLabel(targetVersion) ?? compatibility.recommendedRange;
    // Latest package versions cannot be updated into recommendations requiring another package.
    const isAlreadyLatest = advisory?.status === "current";
    return {
      title:
        t?.(COMPATIBILITY_TITLES[compatibility.status]) ??
        COMPATIBILITY_ENGLISH[compatibility.status],
      detail:
        compatibility.message ??
        (recommendation
          ? (t?.("provider.summary.useVersion", { version: recommendation }) ??
            `Use ${recommendation} for full support.`)
          : (t?.("provider.summary.updateSupport") ?? "Update for full support.")),
      updateCommand:
        targetVersion || latestIsIncompatible || isAlreadyLatest
          ? null
          : (advisory?.updateCommand ?? null),
      emphasis: compatibility.status === "graceful" ? "normal" : "strong",
      targetVersion,
    };
  }
  if (
    !advisory ||
    advisory.status === "current" ||
    advisory.status === "unknown" ||
    latestIsIncompatible
  ) {
    return null;
  }

  const label = t?.("provider.summary.updateAvailable") ?? "Update available";
  const version = advisory.latestVersion;
  const versionLabel = getProviderVersionLabel(version);

  return {
    title: label,
    detail:
      advisory.message ??
      (versionLabel
        ? (t?.("provider.summary.installVersion", { version: versionLabel }) ??
          `${label}: install ${versionLabel}.`)
        : (t?.("provider.summary.installLatest") ??
          `${label}: install the latest provider version.`)),
    updateCommand: advisory.updateCommand,
    emphasis: "normal" as const,
    targetVersion: null,
  };
}
