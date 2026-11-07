import { useTranslate } from "../../../i18n";
import { resolveEnvironmentMachineKind } from "@t3tools/contracts";

import type { AppBarMenu } from "../../../components/ui/AppBar.types";
import { ENVIRONMENT_MACHINE_SYMBOLS } from "../../../components/EnvironmentMachineSymbol";
import { useSettingsEnvironmentFilter } from "../settings-environment-filter";

/** The settings scope filter, as an `AppBar` menu. */
export function useSettingsEnvironmentMenu(): AppBarMenu {
  const t = useTranslate();
  const {
    availableTargets,
    selectedTargets,
    selectedIds,
    selectAll,
    toggleEnvironment,
    selectableProjectGroups,
    selectedProjectKey,
    selectProject,
  } = useSettingsEnvironmentFilter();
  return {
    title: t(
      "mobile.settings.SettingsEnvironmentFilterHeader.filter-settings-environments-and-projects",
    ),
    icon:
      selectedIds === null && selectedProjectKey === null
        ? "line.3.horizontal.decrease"
        : "line.3.horizontal.decrease.circle.fill",
    items: [
      {
        id: "environments",
        title:
          selectedIds === null
            ? t("mobile.dynamic.ThreadListFilters.all-environments")
            : `${selectedTargets.length} ${selectedTargets.length === 1 ? t("settings.scope.environment") : "environments"}`,
        items: [
          {
            id: "all",
            title: t("release4262.all-connected-environments"),
            selected: selectedIds === null,
            onPress: selectAll,
          },
          ...availableTargets.map((entry) => ({
            id: `environment:${entry.environmentId}`,
            title: entry.label,
            icon: ENVIRONMENT_MACHINE_SYMBOLS[resolveEnvironmentMachineKind(entry.serverConfig)],
            subtitle: entry.displayUrl ?? undefined,
            selected: selectedIds === null || selectedIds.has(entry.environmentId),
            onPress: () => toggleEnvironment(entry.environmentId),
          })),
        ],
      },
      {
        id: "projects",
        title:
          selectableProjectGroups.find((group) => group.key === selectedProjectKey)?.label ??
          (selectedProjectKey === null
            ? t("mobile.dynamic.ThreadListFilters.all-projects")
            : t("settings.dynamic.unavailableProject")),
        items: [
          {
            id: "project:all",
            title: t("mobile.dynamic.ThreadListFilters.all-projects"),
            selected: selectedProjectKey === null,
            onPress: () => selectProject(null),
          },
          ...selectableProjectGroups.map((group) => ({
            id: `project:${group.key}`,
            title: projectMenuLabel(group),
            selected: selectedProjectKey === group.key,
            onPress: () => selectProject(group.key),
          })),
        ],
      },
    ],
  };
}

const projectMenuLabel = (group: { readonly label: string; readonly archived: boolean }) =>
  group.archived ? `${group.label} · Archived` : group.label;
