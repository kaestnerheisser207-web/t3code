import { mobileI18n } from "../../i18n";
import { isWorkspaceCatalogPending, type WorkspaceState } from "../../state/workspaceModel";

export interface HomeEmptyState {
  readonly title: string;
  readonly detail: string;
  readonly loading: boolean;
  readonly showsAddEnvironment: boolean;
}

export function deriveHomeEmptyState(
  catalogState: WorkspaceState,
  projectCount: number,
): HomeEmptyState {
  const emptyState = deriveEmptyState(catalogState, projectCount);
  return {
    ...emptyState,
    showsAddEnvironment: !emptyState.loading && !catalogState.hasReadyEnvironment,
  };
}

function deriveEmptyState(
  catalogState: WorkspaceState,
  projectCount: number,
): Omit<HomeEmptyState, "showsAddEnvironment"> {
  if (catalogState.isLoadingConnections) {
    return {
      title: mobileI18n.t("mobile.connect.T3ConnectProfilePage.loading-environments"),
      detail: mobileI18n.t("release4491.text067"),
      loading: true,
    };
  }

  if (!catalogState.hasConnections) {
    return {
      title: mobileI18n.t("mobile.dynamic.ThreadNavigationSidebar.no-environments-connected"),
      detail: mobileI18n.t(
        "mobile.surfaces.WorkspaceEmptyDetail.add-an-environment-to-load-projects-and-start-coding-sessions",
      ),
      loading: false,
    };
  }

  if (
    (catalogState.connectionState === "available" ||
      catalogState.connectionState === "offline" ||
      catalogState.connectionState === "error" ||
      catalogState.connectionState === "unsupported") &&
    !catalogState.hasLoadedShellSnapshot
  ) {
    return {
      title:
        catalogState.connectionState === "unsupported"
          ? "Client not supported"
          : "Environment unavailable",
      detail:
        catalogState.connectionError ??
        "The saved environment is offline. Check the URL or start the environment, then retry.",
      loading: false,
    };
  }

  if (isWorkspaceCatalogPending(catalogState)) {
    return {
      title: catalogState.hasReadyEnvironment ? "Loading threads" : "Connecting to environment",
      detail: mobileI18n.t("release4491.text071"),
      loading: true,
    };
  }

  if (projectCount === 0 && catalogState.hasLoadedShellSnapshot) {
    return {
      title: mobileI18n.t("release4491.text072"),
      detail: mobileI18n.t("release4491.text073"),
      loading: false,
    };
  }

  return {
    title: mobileI18n.t("mobile.dynamic.ThreadNavigationSidebar.no-threads-yet"),
    detail: mobileI18n.t("release4491.text075"),
    loading: false,
  };
}
