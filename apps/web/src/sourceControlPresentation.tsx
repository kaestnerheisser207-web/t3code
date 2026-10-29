import type { TFunction } from "i18next";
import type { ElementType } from "react";
import type { SourceControlProviderInfo } from "@t3tools/contracts";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import type {
  ChangeRequestTerminology,
  SourceControlDefinition,
} from "@t3tools/client-runtime/source-control-clients";
import { PullRequestGlyph } from "~/components/pullRequest/pullRequestIcons";
import { SourceControlIconArtwork } from "./components/SourceControlIconArtwork";

export type { ChangeRequestTerminology } from "@t3tools/client-runtime/source-control-clients";

type SourceControlIcon = ElementType<{ className?: string }>;

const SOURCE_CONTROL_ICONS = new WeakMap<SourceControlDefinition, SourceControlIcon>();

/** One component per definition, so a host's icon keeps its identity across renders. */
export function sourceControlIcon(definition: SourceControlDefinition): SourceControlIcon {
  const artwork = definition.icon;
  if (artwork === null) return PullRequestGlyph.pullRequest;
  let Icon = SOURCE_CONTROL_ICONS.get(definition);
  if (Icon === undefined) {
    Icon = (props: { className?: string }) => (
      <SourceControlIconArtwork {...props} icon={artwork} />
    );
    SOURCE_CONTROL_ICONS.set(definition, Icon);
  }
  return Icon;
}

export interface SourceControlPresentation {
  readonly definition: SourceControlDefinition;
  readonly providerName: string;
  readonly terminology: ChangeRequestTerminology;
  readonly Icon: SourceControlIcon;
}

function presentDefinition(
  definition: SourceControlDefinition,
  providerName: string,
  t?: TFunction,
): SourceControlPresentation {
  const terms = definition.changeRequest;
  const terminology =
    t && (terms.shortLabel === "PR" || terms.shortLabel === "MR")
      ? {
          ...terms,
          singular: t(
            terms.shortLabel === "PR"
              ? "sourceControl.terms.pullRequest"
              : "sourceControl.terms.mergeRequest",
          ),
          plural: t(
            terms.shortLabel === "PR"
              ? "sourceControl.terms.pullRequests"
              : "sourceControl.terms.mergeRequests",
          ),
          shortLabelWithArticle: t(
            terms.shortLabel === "PR" ? "sourceControl.terms.aPr" : "sourceControl.terms.anMr",
          ),
        }
      : terms;
  return {
    definition,
    providerName,
    terminology,
    Icon: sourceControlIcon(definition),
  };
}

export function getSourceControlPresentation(
  provider: SourceControlProviderInfo | null | undefined,
  t?: TFunction,
): SourceControlPresentation {
  const definition = sourceControlClients.get(provider?.kind);
  return presentDefinition(definition, provider?.name || definition.label, t);
}

export function getSourceControlPresentationForKind(
  kind: string,
  t?: TFunction,
): SourceControlPresentation {
  const definition = sourceControlClients.get(kind);
  return presentDefinition(definition, definition.label, t);
}
