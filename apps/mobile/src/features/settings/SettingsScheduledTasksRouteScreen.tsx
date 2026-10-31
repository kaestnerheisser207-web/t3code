import { useTranslate } from "../../i18n";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import * as Dialog from "../../components/ui/Dialog";
import { useAtomValue } from "@effect/atom-react";
import {
  AuthOrchestrationOperateScope,
  resolveProjectProviderInstanceEnabled,
} from "@t3tools/contracts";
import { readEnvironmentScope } from "../../state/session";
import type {
  EnvironmentId,
  ProjectId,
  ScheduledTask,
  ScheduledTaskUpsertInput,
} from "@t3tools/contracts";
import {
  MAX_WEBHOOK_DELIVERY_AGE_MINUTES,
  MAX_WEBHOOK_FILTERS,
  resolveEnvironmentMachineKind,
} from "@t3tools/contracts";
import type { MenuAction } from "@react-native-menu/menu";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
  type AtomCommandResult,
} from "@t3tools/client-runtime/state/runtime";
import {
  DEFAULT_WEBHOOK_PROMPT,
  emptyWebhookFilterDraft,
  parseMaxDeliveryAge,
  parseWebhookFilterDrafts,
  removeWebhookFilterDraft,
  WEBHOOK_FILTER_OPS,
  type WebhookFilterDraft,
} from "@t3tools/client-runtime/scheduled-task-webhook";
import { useRef, useState, type ReactNode } from "react";
import { useFocusEffect, useNavigation, usePreventRemove } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppState, Platform, Pressable, TextInput as RNTextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { AppText as Text } from "../../components/ui/AppText";
import { SymbolView } from "../../components/ui/AppSymbol";
import {
  EnvironmentMachineSymbol,
  ENVIRONMENT_MACHINE_SYMBOLS,
} from "../../components/EnvironmentMachineSymbol";
import { Menu } from "../../components/ui/Menu";
import type { ComposerEditorSelection } from "../../components/ComposerEditor";
import { ScreenScrollView as ScrollView } from "../../components/ui/ScreenScrollView";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { ThemedSwitch } from "../../components/ui/ThemedSwitch";
import { webhookAddress } from "@t3tools/client-runtime/webhook-address";
import { tryCopyTextWithHaptic } from "../../lib/copyTextWithHaptic";
import { usePreparedConnection } from "../../state/session";
import { buildModelOptions } from "../../lib/modelOptions";
import { NativeStackScreenOptions } from "../../native/StackHeader";
import { useProjects, useEnvironmentServerConfig } from "../../state/entities";
import { useEnvironmentQuery } from "../../state/query";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { withNativeGlassHeaderItem } from "../layout/native-glass-header-items";
import { resolveNewTaskBranchLabel } from "../threads/new-task-context-presentation";
import { useVoiceInputController } from "../voice-input/useVoiceInputController";
import { ScheduledTaskPromptField } from "./components/ScheduledTaskPromptField";
import {
  AndroidSettingsEnvironmentFilter,
  SettingsEnvironmentFilterHeader,
} from "./components/SettingsEnvironmentFilterHeader";
import { SettingsScreen } from "./components/SettingsScreen";
import { SettingsSection } from "./components/SettingsSection";
import { useSettingsEnvironmentFilter, type SettingsTarget } from "./settings-environment-filter";
import {
  editDraft,
  parseIntervalMinutes,
  scheduledTaskDefaultModel,
  scheduleFromDraft,
  type ScheduledTaskDraft as Draft,
} from "./scheduledTaskDraft";
import { settingsTargetsForProject } from "./settings-environment-filter.logic";
import { useScheduledTaskEditor } from "./scheduled-task-editor";
import {
  discardScheduledTaskEditor,
  markScheduledTaskEditorSaved,
  scheduledTaskEditorSessionAtom,
} from "./scheduled-task-editor-state";
import { appAtomRegistry } from "../../state/atom-registry";
import {
  formatNextScheduledTaskRun,
  formatScheduledTaskInterval,
} from "./scheduledTaskPresentation";

type ScheduledTaskRoutes = {
  SettingsScheduledTaskNew: undefined;
  SettingsScheduledTaskEdit: undefined;
  SettingsScheduledTaskModel: undefined;
  SettingsScheduledTaskBranch: undefined;
};

const DAYS = [
  { index: 1, label: "Mon" },
  { index: 2, label: "Tue" },
  { index: 3, label: "Wed" },
  { index: 4, label: "Thu" },
  { index: 5, label: "Fri" },
  { index: 6, label: "Sat" },
  { index: 0, label: "Sun" },
] as const;

function describeSchedule(task: ScheduledTask, t: TFunction, locale: string): string {
  if (task.schedule.type === "webhook") return t("schedule.onWebhook");
  if (task.schedule.type === "interval")
    return formatScheduledTaskInterval(task.schedule.everyMs, t);
  const days = task.schedule.weekdays?.length
    ? repeatLabel(task.schedule.weekdays, t, locale)
    : t("schedule.daily");
  return t("schedule.atTime", { days, time: formatTime(task.schedule.timeOfDay, locale) });
}

function formatTime(value: string, locale: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;
  const time = new Date();
  time.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  return time.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12,
  });
}

function timePickerValue(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  const time = new Date();
  time.setHours(
    Number.isInteger(hours) ? (hours ?? 9) : 9,
    Number.isInteger(minutes) ? (minutes ?? 0) : 0,
    0,
    0,
  );
  return time;
}

function repeatLabel(weekdays: ReadonlyArray<number>, t: TFunction, locale: string): string {
  const days = new Set(weekdays);
  if (days.size === 7) return t("schedule.daily");
  if (days.size === 5 && [1, 2, 3, 4, 5].every((day) => days.has(day)))
    return t("schedule.weekdays");
  return (
    DAYS.filter((day) => days.has(day.index))
      .map((day) =>
        new Date(2024, 0, 7 + day.index).toLocaleDateString(locale, { weekday: "short" }),
      )
      .join(", ") || t("schedule.chooseDays")
  );
}

function FormField(props: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly keyboardType?: "decimal-pad" | "number-pad";
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly borderTop?: boolean;
}) {
  return (
    <View
      className={
        props.borderTop ? "gap-2 border-t border-border-subtle px-4 py-3" : "gap-2 px-4 py-3"
      }
    >
      <Text className="text-sm text-foreground-muted">{props.label}</Text>
      <RNTextInput
        accessibilityLabel={props.label}
        value={props.value}
        readOnly={props.disabled}
        onChangeText={props.onChange}
        textAlignVertical="center"
        keyboardType={props.keyboardType}
        placeholder={props.placeholder}
        placeholderTextColorClassName="accent-foreground-muted"
        className="min-h-8 font-sans text-base text-foreground"
      />
    </View>
  );
}

function SelectRow(props: {
  readonly label: string;
  readonly value: string;
  readonly valueIcon?: ReactNode;
  readonly actions: MenuAction[];
  readonly onSelect: (id: string) => void;
  readonly borderTop?: boolean;
}) {
  const value = (
    <View className="min-w-0 flex-1 flex-row items-center justify-end gap-2">
      {props.valueIcon}
      <Text
        textRole="footnote"
        className="shrink text-right text-foreground-muted"
        numberOfLines={1}
      >
        {props.value}
      </Text>
    </View>
  );
  if (props.actions.length === 0) {
    return (
      <View
        className={
          props.borderTop
            ? "min-h-14 flex-row items-center gap-3 border-t border-border-subtle px-4 py-3"
            : "min-h-14 flex-row items-center gap-3 px-4 py-3"
        }
      >
        <Text textRole="body" className="text-foreground">
          {props.label}
        </Text>
        {value}
      </View>
    );
  }
  return (
    <Menu
      actions={props.actions}
      onPressAction={({ nativeEvent }) => props.onSelect(nativeEvent.event)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${props.label}, ${props.value}`}
        className={
          props.borderTop
            ? "min-h-14 flex-row items-center gap-3 border-t border-border-subtle px-4 py-3 active:opacity-70"
            : "min-h-14 flex-row items-center gap-3 px-4 py-3 active:opacity-70"
        }
      >
        <Text textRole="body" className="text-foreground">
          {props.label}
        </Text>
        {value}
        <SymbolView
          name="chevron.down"
          size={14}
          tintColorClassName="accent-chevron"
          type="monochrome"
        />
      </Pressable>
    </Menu>
  );
}

function WebhookFilterRows(props: {
  readonly filters: ReadonlyArray<WebhookFilterDraft>;
  readonly disabled: boolean;
  readonly onChange: (filters: ReadonlyArray<WebhookFilterDraft>) => void;
}) {
  const { t } = useTranslation();
  const update = (index: number, patch: Partial<WebhookFilterDraft>) =>
    props.onChange(
      props.filters.map((filter, at) => (at === index ? { ...filter, ...patch } : filter)),
    );
  return (
    <>
      {props.filters.map((filter, index) => (
        <View key={filter.id}>
          <View className="flex-row items-center gap-3 border-t border-border-subtle px-4 pt-3">
            <Text className="min-w-0 flex-1 text-sm text-foreground-muted">
              {t("mobile.settings.dynamic.filter", { index: index + 1 })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                "mobile.dynamic.SettingsScheduledTasksRouteScreen.remove-filter-param",
                { value: index + 1 },
              )}
              disabled={props.disabled}
              hitSlop={8}
              onPress={() => props.onChange(removeWebhookFilterDraft(props.filters, filter.id))}
              className="active:opacity-70"
            >
              <SymbolView name="trash" size={16} tintColorClassName="accent-danger-foreground" />
            </Pressable>
          </View>
          <FormField
            label={t("mobile.settings.SettingsScheduledTasksRouteScreen.path")}
            value={filter.path}
            placeholder="body.action"
            disabled={props.disabled}
            onChange={(path) => update(index, { path })}
          />
          <SelectRow
            label={t("mobile.settings.SettingsScheduledTasksRouteScreen.test")}
            value={WEBHOOK_FILTER_OPS.find((option) => option.op === filter.op)?.label ?? ""}
            actions={WEBHOOK_FILTER_OPS.map((option) => ({
              id: option.op,
              title: option.label,
              state: option.op === filter.op ? ("on" as const) : undefined,
            }))}
            onSelect={(id) => {
              const known = WEBHOOK_FILTER_OPS.find((option) => option.op === id);
              if (known) update(index, { op: known.op });
            }}
          />
          {filter.op === "exists" ? null : (
            <FormField
              label={
                filter.op === "in"
                  ? t("mobile.dynamic.SettingsScheduledTasksRouteScreen.values-comma-separated")
                  : t("mobile.dynamic.SettingsScheduledTasksRouteScreen.value")
              }
              value={filter.value}
              placeholder={filter.op === "in" ? "opened, reopened" : "opened"}
              disabled={props.disabled}
              onChange={(value) => update(index, { value })}
            />
          )}
        </View>
      ))}
      {props.filters.length < MAX_WEBHOOK_FILTERS ? (
        <Pressable
          accessibilityRole="button"
          disabled={props.disabled}
          onPress={() => props.onChange([...props.filters, emptyWebhookFilterDraft()])}
          className="min-h-14 flex-row items-center gap-3 border-t border-border-subtle px-4 py-3 active:opacity-70"
        >
          <Text textRole="body" className="min-w-0 flex-1 text-foreground">
            {t("mobile.settings.SettingsScheduledTasksRouteScreen.add-filter")}
          </Text>
          <SymbolView name="plus" size={16} tintColorClassName="accent-icon" />
        </Pressable>
      ) : null}
      {props.filters.length > 0 ? (
        <Text className="px-4 pb-3 text-sm text-foreground-muted">
          {t(
            "mobile.settings.SettingsScheduledTasksRouteScreen.runs-only-when-every-filter-matches-other-requests-are-logged-as-filtered-separate-is-one-of-values-with-commas-a-value-can-t-contain-a-comma",
          )}
        </Text>
      ) : null}
    </>
  );
}

function PickerRow(props: {
  readonly label: string;
  readonly value: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly borderTop?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.label}, ${props.value}`}
      accessibilityState={{ disabled: props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      className={
        props.borderTop
          ? "min-h-14 flex-row items-center gap-3 border-t border-border-subtle px-4 py-3 active:opacity-70 disabled:opacity-50"
          : "min-h-14 flex-row items-center gap-3 px-4 py-3 active:opacity-70 disabled:opacity-50"
      }
    >
      <Text textRole="body" className="text-foreground">
        {props.label}
      </Text>
      <Text
        textRole="footnote"
        className="min-w-0 flex-1 text-right text-foreground-muted"
        numberOfLines={1}
      >
        {props.value}
      </Text>
      <SymbolView
        name="chevron.right"
        size={14}
        tintColorClassName="accent-chevron"
        type="monochrome"
      />
    </Pressable>
  );
}

export function SettingsScheduledTasksRouteScreen() {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now);
  useFocusEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const timer = setInterval(updateNow, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") updateNow();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  });
  const { availableTargets, selectedTargets, selectedProjectKey, projectGroups } =
    useSettingsEnvironmentFilter();
  const selectedGroup = projectGroups.find((group) => group.key === selectedProjectKey);
  const visibleEnvironments = settingsTargetsForProject(
    selectedTargets,
    selectedProjectKey === null ? null : selectedGroup,
  );
  const { startEditor, resetEditor } = useScheduledTaskEditor();
  const navigation = useNavigation<NativeStackNavigationProp<ScheduledTaskRoutes>>();
  const insets = useSafeAreaInsets();
  const newTask = () => {
    if (visibleEnvironments.length === 0) return;
    resetEditor();
    navigation.navigate("SettingsScheduledTaskNew");
  };

  return (
    <>
      <SettingsEnvironmentFilterHeader
        trailingItems={[
          withNativeGlassHeaderItem({
            type: "button",
            label: "",
            accessibilityLabel: t("mobile.schedule.new"),
            icon: { type: "sfSymbol", name: "plus" } as const,
            disabled: visibleEnvironments.length === 0,
            onPress: newTask,
          }),
        ]}
      />
      <SettingsScreen
        title={t("mobile.settings.SettingsScheduledTasksRouteScreen.scheduled-tasks")}
        trailing={
          <View className="flex-row items-center">
            <AndroidSettingsEnvironmentFilter />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mobile.settings.SettingsScheduledTasksRouteScreen.new-task")}
              accessibilityState={{ disabled: visibleEnvironments.length === 0 }}
              disabled={visibleEnvironments.length === 0}
              onPress={newTask}
              className="size-11 items-center justify-center rounded-full disabled:opacity-50"
            >
              <SymbolView name="plus" size={22} tintColorClassName="accent-icon" />
            </Pressable>
          </View>
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
        >
          {visibleEnvironments.length > 0 ? (
            visibleEnvironments.map((environment) => (
              <EnvironmentTasks
                key={environment.environmentId}
                environment={environment}
                now={now}
                projectIds={
                  selectedProjectKey === null
                    ? null
                    : (selectedGroup?.members
                        .filter(
                          (member) => member.project.environmentId === environment.environmentId,
                        )
                        .map((member) => member.project.id) ?? [])
                }
                onEdit={(task) => {
                  startEditor({
                    environmentId: environment.environmentId,
                    environmentLabel: environment.label,
                    draft: editDraft(task),
                  });
                  navigation.navigate("SettingsScheduledTaskEdit");
                }}
              />
            ))
          ) : (
            <Text className="px-2 text-base text-foreground-muted">
              {availableTargets.length === 0
                ? t(
                    "mobile.dynamic.SettingsScheduledTasksRouteScreen.connect-an-environment-to-view-and-create-scheduled-tasks",
                  )
                : t(
                    "mobile.dynamic.SettingsScheduledTasksRouteScreen.no-environments-match-these-filters-change-the-filter-above",
                  )}
            </Text>
          )}
        </ScrollView>
      </SettingsScreen>
    </>
  );
}

// The t("mobile.schedule.new") action and takeScheduledTaskNewLink clear the editor before
// this screen opens, so it starts from the default target.
export function SettingsScheduledTaskNewRouteScreen() {
  const { t } = useTranslation();
  return (
    <SettingsScheduledTaskEditorScreen
      title={t("mobile.settings.SettingsScheduledTasksRouteScreen.new-scheduled-task")}
    />
  );
}

export function SettingsScheduledTaskEditRouteScreen() {
  const { t } = useTranslation();
  return (
    <SettingsScheduledTaskEditorScreen
      title={t("mobile.settings.SettingsScheduledTasksRouteScreen.edit-scheduled-task")}
    />
  );
}

function SettingsScheduledTaskEditorScreen({ title }: { readonly title: string }) {
  const t = useTranslate();
  const { editor, voiceOwnerKey, readEditor, setEditor, hasChanges, draftForEnvironment } =
    useScheduledTaskEditor();
  const { availableTargets } = useSettingsEnvironmentFilter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  // Set once the save lands, so the removal guard lets the editor close.
  const saved = useRef(false);
  const ownerKey = editor ? `${voiceOwnerKey}:${editor.environmentId}` : null;
  const prompt = editor?.draft.prompt ?? "";
  const [selectionState, setSelectionState] = useState<{
    readonly ownerKey: string | null;
    readonly selection: ComposerEditorSelection;
  } | null>(null);
  const selection =
    selectionState?.ownerKey === ownerKey
      ? selectionState.selection
      : { start: prompt.length, end: prompt.length };
  const setSelection = (next: ComposerEditorSelection) =>
    setSelectionState({ ownerKey, selection: next });
  const setPrompt = (next: string) =>
    setEditor((current) =>
      current
        ? {
            ...current,
            draft: { ...current.draft, prompt: next },
          }
        : current,
    );
  const voiceInput = useVoiceInputController({
    ownerKey,
    label: editor?.draft.title.trim() || title,
    subscribeToDraftChanges: (onChange) =>
      appAtomRegistry.subscribe(scheduledTaskEditorSessionAtom, onChange),
    selection,
    readDraftMessage: () => {
      const current = readEditor();
      if (current?.environmentId !== editor?.environmentId) return null;
      return current?.draft.prompt ?? null;
    },
    onChangeSelection: setSelection,
    onChangeDraftMessage: (text) => {
      if (readEditor()?.environmentId === editor?.environmentId) setPrompt(text);
    },
    disabled: saving,
  });
  const preventRemove = hasChanges || saving;
  usePreventRemove(preventRemove, ({ data }) => {
    if (saved.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (saving) {
      Dialog.alert(t("mobile.schedule.saving"), t("mobile.schedule.waitSaving"));
      return;
    }
    Dialog.alert(t("mobile.schedule.discardTitle"), t("mobile.schedule.discardDetail"), [
      { text: t("mobile.schedule.keepEditing"), style: "cancel" },
      {
        text: t("mobile.schedule.discard"),
        style: "destructive",
        onPress: () => {
          if (voiceInput.isBusy) voiceInput.cancel();
          discardScheduledTaskEditor();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });
  return (
    <SettingsScreen title={title}>
      {Platform.OS === "ios" ? (
        <NativeStackScreenOptions
          options={{
            headerBackVisible: false,
            gestureEnabled: !preventRemove,
            // Native Back pops before removal guards; a bar action lets the guard run first.
            unstable_headerLeftItems: () => [
              withNativeGlassHeaderItem({
                type: "button",
                label: "",
                accessibilityLabel: t("mobile.schedule.back"),
                icon: { type: "sfSymbol", name: "chevron.backward" },
                onPress: () => navigation.goBack(),
              }),
            ],
          }}
        />
      ) : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
      >
        {editor ? (
          <TaskForm
            key={editor.environmentId}
            environmentId={editor.environmentId}
            environmentLabel={
              availableTargets.find((target) => target.environmentId === editor.environmentId)
                ?.label ?? editor.environmentLabel
            }
            availableTargets={availableTargets}
            draft={editor.draft}
            saving={saving}
            setSaving={setSaving}
            dictationPending={voiceInput.blocksSubmission}
            promptField={
              <ScheduledTaskPromptField
                value={prompt}
                onChange={setPrompt}
                selection={selection}
                onChangeSelection={setSelection}
                disabled={saving}
                voiceInput={voiceInput}
              />
            }
            setDraft={(draft) => {
              if (!saving) setEditor({ ...editor, draft });
            }}
            onSaved={() => {
              saved.current = true;
              markScheduledTaskEditorSaved();
              if (navigation.isFocused()) navigation.goBack();
            }}
            onChangeEnvironment={(target) => {
              if (target.environmentId === editor.environmentId) return;
              setEditor({
                environmentId: target.environmentId,
                environmentLabel: target.label,
                draft: {
                  ...draftForEnvironment(target.environmentId),
                  title: editor.draft.title,
                  prompt: editor.draft.prompt,
                  schedule: editor.draft.schedule,
                  enabled: editor.draft.enabled,
                },
              });
            }}
          />
        ) : (
          <Text className="px-2 text-base text-foreground-muted">
            {availableTargets.length === 0
              ? t(
                  "mobile.dynamic.SettingsScheduledTasksRouteScreen.connect-an-environment-to-create-a-scheduled-task",
                )
              : t(
                  "mobile.dynamic.SettingsScheduledTasksRouteScreen.no-environments-match-the-current-filters-change-the-filters-to-create-a-task",
                )}
          </Text>
        )}
      </ScrollView>
    </SettingsScreen>
  );
}

function TaskForm({
  environmentId,
  environmentLabel,
  availableTargets,
  draft,
  saving,
  setSaving,
  dictationPending,
  promptField,
  setDraft,
  onSaved,
  onChangeEnvironment,
}: {
  readonly environmentId: EnvironmentId;
  readonly environmentLabel: string;
  readonly availableTargets: readonly SettingsTarget[];
  readonly draft: Draft;
  readonly saving: boolean;
  readonly setSaving: (saving: boolean) => void;
  readonly dictationPending: boolean;
  readonly promptField: ReactNode;
  readonly setDraft: (draft: Draft) => void;
  readonly onSaved: () => void;
  readonly onChangeEnvironment: (target: SettingsTarget) => void;
}) {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<ScheduledTaskRoutes>>();
  const tasks = useEnvironmentQuery(
    serverEnvironment.scheduledTasksLive({ environmentId, input: {} }),
  );
  // Pinned first. The chosen project stays listed after it is archived.
  const projects = useProjects()
    .filter(
      (project) =>
        project.environmentId === environmentId &&
        (project.archivedAt == null ||
          project.id === draft.projectId ||
          project.id === draft.task?.projectId),
    )
    .sort((left, right) => Number(right.pinnedAt != null) - Number(left.pinnedAt != null));
  const config = useEnvironmentServerConfig(environmentId);
  const modelOptions = buildModelOptions(config, null, undefined, draft.projectId);
  const canOperate = useAtomValue(
    serverEnvironment.upsertScheduledTask.permissionAtom(environmentId),
  );
  const upsert = useAtomCommand(serverEnvironment.upsertScheduledTask, {
    label: "scheduled task upsert",
    reportFailure: false,
  });
  const submissionPending = useRef(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const taskMissing =
    draft.task !== null &&
    tasks.data !== null &&
    !tasks.data.tasks.some((task) => task.id === draft.task?.id);
  const environmentUnavailable = !availableTargets.some(
    (target) => target.environmentId === environmentId,
  );

  const failure = (title: string, result: AtomCommandResult<unknown, unknown>) => {
    if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
      Dialog.alert(title, String(squashAtomCommandFailure(result)));
    }
  };

  const save = async () => {
    if (
      !readEnvironmentScope(environmentId, AuthOrchestrationOperateScope) ||
      submissionPending.current ||
      saving ||
      dictationPending ||
      taskMissing ||
      environmentUnavailable
    )
      return;
    // Preserve signatures edited on other clients by sending the task's current value.
    const liveTask = tasks.data?.tasks.find((task) => task.id === draft.task?.id);
    const schedule = scheduleFromDraft(
      draft.schedule.mode === "webhook" && liveTask?.schedule.type === "webhook"
        ? { ...draft.schedule, signature: liveTask.schedule.signature }
        : draft.schedule,
    );
    if (
      draft.schedule.mode === "webhook" &&
      parseMaxDeliveryAge(draft.schedule.maxDeliveryAgeMinutes) === undefined
    ) {
      Dialog.alert(
        t("mobile.schedule.invalidAge"),
        t("mobile.schedule.ageHint", { max: MAX_WEBHOOK_DELIVERY_AGE_MINUTES }),
      );
      return;
    }
    const parsedFilters = parseWebhookFilterDrafts(draft.schedule.filters);
    if (draft.schedule.mode === "webhook" && "error" in parsedFilters) {
      Dialog.alert(t("mobile.schedule.invalidFilter"), parsedFilters.error);
      return;
    }
    if (draft.schedule.mode === "webhook" && schedule === null) {
      Dialog.alert(t("mobile.schedule.invalidWebhook"), t("settings.extra.webhookHint"));
      return;
    }
    if (
      !draft.title.trim() ||
      !draft.prompt.trim() ||
      !draft.projectId ||
      !draft.modelSelection ||
      !schedule ||
      (draft.workspace === "existing_worktree" && !draft.checkoutPath.trim())
    ) {
      Dialog.alert(t("mobile.schedule.incomplete"), t("mobile.schedule.incompleteHint"));
      return;
    }
    if (!projects.some((project) => project.id === draft.projectId)) {
      Dialog.alert(t("mobile.schedule.projectUnavailable"), t("mobile.schedule.projectHint"));
      return;
    }
    const input: ScheduledTaskUpsertInput = {
      ...(draft.task ? { id: draft.task.id, requireExisting: true } : {}),
      title: draft.title.trim(),
      prompt: draft.prompt.trim(),
      projectId: draft.projectId,
      modelSelection: draft.modelSelection,
      schedule,
      enabled: draft.enabled,
      threadId: draft.task?.threadId ?? null,
      workspaceStrategy:
        draft.workspace === "root"
          ? { type: "root" }
          : draft.workspace === "existing_worktree"
            ? { type: "existing_worktree", worktreePath: draft.checkoutPath.trim() }
            : {
                type: "worktree",
                baseRef: draft.baseRef.trim() || "main",
                startFromOrigin: draft.startFromOrigin,
              },
      runtimeMode: draft.runtimeMode,
      interactionMode:
        draft.task?.interactionMode ?? t("web.dynamic.EnvironmentIconPicker.default"),
      creationSource: draft.task?.creationSource ?? "mobile",
    };
    submissionPending.current = true;
    setSaving(true);
    const result = await upsert({ environmentId, input });
    setSaving(false);
    if (result._tag === "Failure") {
      submissionPending.current = false;
      failure(t("mobile.schedule.saveFailed"), result);
      return;
    }
    onSaved();
  };

  return (
    <View className="gap-5">
      <View
        className="gap-5"
        pointerEvents={saving ? "none" : "auto"}
        accessibilityElementsHidden={saving}
        importantForAccessibility={saving ? "no-hide-descendants" : "auto"}
      >
        {taskMissing ? (
          <Text className="px-1 text-base text-danger-foreground">
            {t("mobile.settings.SettingsScheduledTasksRouteScreen.this-task-no-longer-exists")}
          </Text>
        ) : null}

        {environmentUnavailable ? (
          <Text className="px-1 text-base text-danger-foreground">
            {t(
              "mobile.settings.SettingsScheduledTasksRouteScreen.this-environment-is-disconnected-reconnect-before-saving",
            )}
          </Text>
        ) : null}
        <SettingsSection>
          <SelectRow
            label={t("mobile.settings.SettingsScheduledTasksRouteScreen.runs-on")}
            value={environmentLabel}
            valueIcon={
              <EnvironmentMachineSymbol
                kind={resolveEnvironmentMachineKind(config)}
                size={18}
                tintColorClassName="accent-foreground-muted"
              />
            }
            actions={
              draft.task || saving || dictationPending
                ? []
                : availableTargets.map((target) => ({
                    id: target.environmentId,
                    title: target.label,
                    image:
                      ENVIRONMENT_MACHINE_SYMBOLS[
                        resolveEnvironmentMachineKind(target.serverConfig)
                      ],
                    state: target.environmentId === environmentId ? "on" : undefined,
                  }))
            }
            onSelect={(id) => {
              const target = availableTargets.find((entry) => entry.environmentId === id);
              if (target) onChangeEnvironment(target);
            }}
          />
        </SettingsSection>
        <SettingsSection title={t("mobile.settings.SettingsScheduledTasksRouteScreen.task")}>
          <FormField
            label={t("mobile.settings.SettingsScheduledTasksRouteScreen.name")}
            disabled={saving}
            value={draft.title}
            placeholder={t("mobile.settings.SettingsScheduledTasksRouteScreen.check-for-issues")}
            onChange={(title) => setDraft({ ...draft, title })}
          />
          {promptField}
        </SettingsSection>

        <SettingsSection title={t("mobile.settings.SettingsScheduledTasksRouteScreen.context")}>
          <SelectRow
            label={t("mobile.settings.SettingsScheduledTasksRouteScreen.project")}
            value={
              projects.find((project) => project.id === draft.projectId)?.title ??
              (projects.length
                ? t("mobile.schedule.chooseProject")
                : t("mobile.schedule.noProjects"))
            }
            actions={projects.map((project) => ({
              id: project.id,
              title: project.title,
              state: project.id === draft.projectId ? "on" : undefined,
            }))}
            onSelect={(id) => {
              const project = projects.find((item) => item.id === id);
              if (!project) return;
              const keepsExplicitModel =
                draft.modelSelectionIsExplicit &&
                (draft.modelSelection === null ||
                  !config?.settings ||
                  resolveProjectProviderInstanceEnabled(
                    config.settings,
                    project.id,
                    draft.modelSelection.instanceId,
                  ));
              setDraft({
                ...draft,
                projectId: project.id,
                modelSelection: keepsExplicitModel
                  ? draft.modelSelection
                  : scheduledTaskDefaultModel(config, project),
                modelSelectionIsExplicit: keepsExplicitModel,
              });
            }}
          />
          <PickerRow
            label={t("mobile.settings.SettingsScheduledTasksRouteScreen.model")}
            borderTop
            value={
              modelOptions.find(
                (option) =>
                  option.selection.instanceId === draft.modelSelection?.instanceId &&
                  option.selection.model === draft.modelSelection?.model,
              )?.label ??
              draft.modelSelection?.model ??
              (modelOptions.length
                ? t("mobile.schedule.chooseModel")
                : t("mobile.schedule.noModels"))
            }
            onPress={() => navigation.navigate("SettingsScheduledTaskModel")}
            disabled={saving || dictationPending || environmentUnavailable}
          />
        </SettingsSection>

        <SettingsSection title={t("mobile.settings.SettingsScheduledTasksRouteScreen.workspace")}>
          <SelectRow
            label={t("mobile.settings.SettingsScheduledTasksRouteScreen.run-in")}
            value={
              draft.workspace === "worktree"
                ? t("mobile.schedule.worktree")
                : draft.workspace === "root"
                  ? t("mobile.schedule.projectCheckout")
                  : t("mobile.schedule.checkout")
            }
            actions={[
              {
                id: "worktree",
                title: t("mobile.schedule.worktree"),
                state: draft.workspace === "worktree" ? "on" : undefined,
              },
              {
                id: "root",
                title: t("mobile.schedule.projectCheckout"),
                state: draft.workspace === "root" ? "on" : undefined,
              },
              {
                id: "existing_worktree",
                title: t("mobile.schedule.checkout"),
                state: draft.workspace === "existing_worktree" ? "on" : undefined,
              },
            ]}
            onSelect={(id) => {
              if (id === "worktree" || id === "root" || id === "existing_worktree")
                setDraft({ ...draft, workspace: id });
            }}
          />
          {draft.workspace === "worktree" ? (
            <PickerRow
              label={t("mobile.settings.SettingsScheduledTasksRouteScreen.base-branch")}
              value={resolveNewTaskBranchLabel({
                branchName: draft.baseRef,
                startFromOrigin: draft.startFromOrigin,
                workspaceMode: "worktree",
              })}
              borderTop
              disabled={!draft.projectId || saving || dictationPending || environmentUnavailable}
              onPress={() => navigation.navigate("SettingsScheduledTaskBranch")}
            />
          ) : null}
          {draft.workspace === "existing_worktree" ? (
            <FormField
              label={t("mobile.settings.SettingsScheduledTasksRouteScreen.checkout-path")}
              disabled={saving}
              value={draft.checkoutPath}
              borderTop
              onChange={(checkoutPath) => setDraft({ ...draft, checkoutPath })}
            />
          ) : null}
        </SettingsSection>

        <SettingsSection title={t("mobile.settings.SettingsScheduledTasksRouteScreen.schedule")}>
          <View className="px-4 py-3">
            <SegmentedControl
              variant="card"
              options={[
                { value: "fixed_time", label: t("mobile.schedule.atTime") },
                { value: "interval", label: t("mobile.schedule.interval") },
                { value: "webhook", label: t("mobile.schedule.webhook") },
              ]}
              selected={draft.schedule.mode}
              onSelect={(mode) => {
                setTimePickerOpen(false);
                setDraft({
                  ...draft,
                  prompt:
                    mode === "webhook" && !draft.prompt.trim()
                      ? DEFAULT_WEBHOOK_PROMPT
                      : draft.prompt,
                  schedule: { ...draft.schedule, mode },
                });
              }}
            />
          </View>
          {draft.schedule.mode === "fixed_time" ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  "mobile.dynamic.SettingsScheduledTasksRouteScreen.time-param",
                  { value: formatTime(draft.schedule.timeOfDay, i18n.resolvedLanguage ?? "en") },
                )}
                onPress={() => setTimePickerOpen((open) => !open)}
                className="min-h-14 flex-row items-center gap-3 border-t border-border-subtle px-4 py-3 active:opacity-70"
              >
                <Text textRole="body" className="text-foreground">
                  {t("mobile.settings.SettingsScheduledTasksRouteScreen.time")}
                </Text>
                <Text
                  textRole="footnote"
                  className="min-w-0 flex-1 text-right text-foreground-muted"
                >
                  {formatTime(draft.schedule.timeOfDay, i18n.resolvedLanguage ?? "en")}
                </Text>
                <SymbolView
                  name="chevron.right"
                  size={14}
                  tintColorClassName="accent-chevron"
                  type="monochrome"
                />
              </Pressable>
              {timePickerOpen ? (
                <DateTimePicker
                  value={timePickerValue(draft.schedule.timeOfDay)}
                  mode="time"
                  display={
                    Platform.OS === "ios"
                      ? "spinner"
                      : t("web.dynamic.EnvironmentIconPicker.default")
                  }
                  onDismiss={() => setTimePickerOpen(false)}
                  onValueChange={(_, selected) => {
                    const timeOfDay = `${String(selected.getHours()).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}`;
                    setDraft({ ...draft, schedule: { ...draft.schedule, timeOfDay } });
                  }}
                />
              ) : null}
              <SelectRow
                label={t("mobile.settings.SettingsScheduledTasksRouteScreen.repeat")}
                value={repeatLabel(draft.schedule.weekdays, t, i18n.resolvedLanguage ?? "en")}
                borderTop
                actions={[
                  {
                    id: "every_day",
                    title: t("schedule.daily"),
                    state: draft.schedule.weekdays.length === 7 ? "on" : undefined,
                  },
                  {
                    id: "weekdays",
                    title: t("schedule.weekdays"),
                    state:
                      new Set(draft.schedule.weekdays).size === 5 &&
                      [1, 2, 3, 4, 5].every((day) => draft.schedule.weekdays.includes(day))
                        ? "on"
                        : undefined,
                  },
                  ...DAYS.map((day) => ({
                    id: String(day.index),
                    title: new Date(2024, 0, 7 + day.index).toLocaleDateString(
                      i18n.resolvedLanguage ?? "en",
                      { weekday: "short" },
                    ),
                    attributes: { keepsMenuPresented: true },
                    state: draft.schedule.weekdays.includes(day.index)
                      ? ("on" as const)
                      : undefined,
                  })),
                ]}
                onSelect={(id) => {
                  const weekdays =
                    id === "every_day"
                      ? DAYS.map((day) => day.index)
                      : id === "weekdays"
                        ? [1, 2, 3, 4, 5]
                        : (() => {
                            const day = DAYS.find((item) => String(item.index) === id);
                            if (!day) return draft.schedule.weekdays;
                            return draft.schedule.weekdays.includes(day.index)
                              ? draft.schedule.weekdays.filter((index) => index !== day.index)
                              : [...draft.schedule.weekdays, day.index];
                          })();
                  setDraft({ ...draft, schedule: { ...draft.schedule, weekdays } });
                }}
              />
            </>
          ) : draft.schedule.mode === "webhook" ? (
            <>
              <WebhookScheduleDetails
                environmentId={environmentId}
                // Use the live row for rotated URLs; hide the URL once a loaded list no longer contains the task.
                task={
                  tasks.data
                    ? (tasks.data.tasks.find((task) => task.id === draft.task?.id) ?? null)
                    : draft.task
                }
                signatureConfigured={draft.schedule.signature !== null}
                disabled={!canOperate || saving || environmentUnavailable}
              />
              <FormField
                label={t(
                  "mobile.settings.SettingsScheduledTasksRouteScreen.skip-requests-older-than-minutes",
                )}
                value={draft.schedule.maxDeliveryAgeMinutes}
                placeholder={t(
                  "mobile.settings.SettingsScheduledTasksRouteScreen.run-every-request",
                )}
                keyboardType="number-pad"
                disabled={saving}
                borderTop
                onChange={(maxDeliveryAgeMinutes) =>
                  setDraft({ ...draft, schedule: { ...draft.schedule, maxDeliveryAgeMinutes } })
                }
              />
              <WebhookFilterRows
                filters={draft.schedule.filters}
                disabled={saving}
                onChange={(filters) =>
                  setDraft({ ...draft, schedule: { ...draft.schedule, filters } })
                }
              />
              <FormField
                label={t("mobile.settings.SettingsScheduledTasksRouteScreen.replay-key-template")}
                value={draft.schedule.replayKey}
                placeholder="{{headers.delivery-id}}"
                disabled={saving}
                borderTop
                onChange={(replayKey) =>
                  setDraft({ ...draft, schedule: { ...draft.schedule, replayKey } })
                }
              />
              <FormField
                label={t("mobile.settings.SettingsScheduledTasksRouteScreen.coalesce-key-template")}
                value={draft.schedule.coalesceKey}
                placeholder="{{body.id}}"
                disabled={saving}
                borderTop
                onChange={(coalesceKey) =>
                  setDraft({ ...draft, schedule: { ...draft.schedule, coalesceKey } })
                }
              />
              <FormField
                label={t(
                  "mobile.settings.SettingsScheduledTasksRouteScreen.coalesce-window-seconds-10-3600",
                )}
                value={draft.schedule.coalesceWindowSeconds}
                placeholder="120"
                keyboardType="number-pad"
                disabled={saving}
                borderTop
                onChange={(coalesceWindowSeconds) =>
                  setDraft({ ...draft, schedule: { ...draft.schedule, coalesceWindowSeconds } })
                }
              />
              <Text className="px-4 pb-3 text-sm text-foreground-muted">
                {t(
                  "mobile.settings.SettingsScheduledTasksRouteScreen.replay-keys-suppress-repeats-for-7-days-coalescing-runs-the-latest-payload-when-the-window-from-the-first-delivery-closes-empty-keys-run-normally",
                )}
              </Text>
            </>
          ) : (
            <>
              <FormField
                label={t("mobile.settings.SettingsScheduledTasksRouteScreen.minutes-between-runs")}
                value={draft.schedule.intervalMinutes}
                keyboardType="decimal-pad"
                disabled={saving}
                borderTop
                onChange={(intervalMinutes) =>
                  setDraft({ ...draft, schedule: { ...draft.schedule, intervalMinutes } })
                }
              />
              {!(parseIntervalMinutes(draft.schedule.intervalMinutes) >= 1) ? (
                <Text className="px-4 pb-3 text-sm text-danger-foreground">
                  {t(
                    "mobile.settings.SettingsScheduledTasksRouteScreen.intervals-must-be-at-least-1-minute-update-this-interval-before-saving",
                  )}
                </Text>
              ) : draft.task?.schedule.type === "interval" &&
                draft.task.schedule.everyMs < 60_000 ? (
                <Text className="px-4 pb-3 text-sm text-foreground-muted">
                  {t(
                    "mobile.settings.SettingsScheduledTasksRouteScreen.this-task-previously-ran-more-than-once-per-minute-saving-requires-an-interval-of-at-least-1-minute",
                  )}
                </Text>
              ) : null}
            </>
          )}
          <View className="min-h-14 flex-row items-center gap-3 border-t border-border-subtle px-4 py-3">
            <Text textRole="body" className="min-w-0 flex-1 text-foreground">
              {t("mobile.settings.SettingsScheduledTasksRouteScreen.enabled")}
            </Text>
            <ThemedSwitch
              accessibilityLabel={t(
                "mobile.settings.SettingsScheduledTasksRouteScreen.task-enabled",
              )}
              value={draft.enabled}
              onValueChange={(enabled) => setDraft({ ...draft, enabled })}
            />
          </View>
        </SettingsSection>
        {draft.schedule.mode === "fixed_time" ? (
          <Text className="px-2 text-sm text-foreground-muted">
            {t(
              "mobile.settings.SettingsScheduledTasksRouteScreen.time-uses-the-environment-s-time-zone-which-may-differ-from-your-phone-s",
            )}
          </Text>
        ) : null}
      </View>
      <Button
        tone="primary"
        fullWidth
        loading={saving}
        disabled={!canOperate || dictationPending || taskMissing || environmentUnavailable}
        onPress={() => void save()}
        label={
          saving
            ? t("mobile.dynamic.SettingsScheduledTasksRouteScreen.saving")
            : draft.task
              ? t("mobile.dynamic.SettingsScheduledTasksRouteScreen.save-changes")
              : t("mobile.dynamic.SettingsScheduledTasksRouteScreen.create-task")
        }
      />
    </View>
  );
}

function WebhookScheduleDetails({
  environmentId,
  task,
  signatureConfigured,
  disabled,
}: {
  readonly environmentId: EnvironmentId;
  readonly task: ScheduledTask | null;
  readonly signatureConfigured: boolean;
  readonly disabled: boolean;
}) {
  const { t } = useTranslation();
  const [rotating, setRotating] = useState(false);
  const rotate = useAtomCommand(serverEnvironment.rotateScheduledTaskWebhookToken, {
    label: "scheduled task rotate webhook token",
    reportFailure: false,
  });
  const preparedConnection = usePreparedConnection(environmentId);
  const httpBaseUrl =
    preparedConnection._tag === "Some" ? preparedConnection.value.httpBaseUrl : null;
  const webhook = task?.schedule.type === "webhook" ? task.webhook : undefined;
  const resolved = webhook ? webhookAddress(webhook, httpBaseUrl) : null;
  return (
    <View className="gap-2 border-t border-border-subtle px-4 py-3">
      <Text className="text-sm text-foreground-muted">
        {t(
          "mobile.dynamic.SettingsScheduledTasksRouteScreen.the-prompt-can-use-param-param-param-param-and-param-the-filled-in-prompt-is-all-the-agent-sees",
          {
            bodyPathTemplate: "{{body.a.b}}",
            headerTemplate: "{{headers.name}}",
            queryTemplate: "{{query.name}}",
            bodyTemplate: "{{body}}",
            requestTemplate: "{{request}}",
          },
        )}
      </Text>
      {task === null || resolved === null ? (
        <Text className="text-sm text-foreground-muted">
          {t(
            "mobile.settings.SettingsScheduledTasksRouteScreen.save-the-task-to-get-its-webhook-url",
          )}
        </Text>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              "mobile.settings.SettingsScheduledTasksRouteScreen.copy-webhook-url",
            )}
            accessibilityHint={t(
              "mobile.settings.SettingsScheduledTasksRouteScreen.copies-the-url-to-the-clipboard",
            )}
            disabled={!resolved.copyable}
            onPress={() => void tryCopyTextWithHaptic(resolved.address)}
            className="gap-1 active:opacity-70"
          >
            <Text textRole="body" className="text-foreground">
              {resolved.copyable
                ? t("mobile.dynamic.SettingsScheduledTasksRouteScreen.webhook-url")
                : t("mobile.dynamic.SettingsScheduledTasksRouteScreen.webhook-path")}
            </Text>
            <Text className="text-sm text-foreground-muted" numberOfLines={2} selectable>
              {resolved.address}
            </Text>
          </Pressable>
          {resolved.note !== null ? (
            <Text className="text-sm text-foreground-muted">{resolved.note}</Text>
          ) : null}
          <Button
            label={
              rotating
                ? t("mobile.dynamic.SettingsScheduledTasksRouteScreen.rotating")
                : t("mobile.dynamic.SettingsScheduledTasksRouteScreen.rotate-url")
            }
            tone="danger"
            disabled={disabled || rotating}
            onPress={() =>
              Dialog.alert(t("mobile.schedule.rotateTitle"), t("mobile.schedule.rotateDetail"), [
                { text: t("mobile.schedule.cancel"), style: "cancel" },
                {
                  text: t("mobile.schedule.rotate"),
                  style: "destructive",
                  onPress: () => {
                    setRotating(true);
                    void rotate({ environmentId, input: { id: task.id } }).then((result) => {
                      setRotating(false);
                      if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
                        Dialog.alert(
                          t("mobile.schedule.rotateFailed"),
                          String(squashAtomCommandFailure(result)),
                        );
                      }
                    });
                  },
                },
              ])
            }
            loading={rotating}
          />
        </>
      )}
      {signatureConfigured ? (
        <Text className="text-sm text-foreground-muted">
          {t(
            "mobile.settings.SettingsScheduledTasksRouteScreen.signature-check-configured-on-desktop-web",
          )}
        </Text>
      ) : null}
    </View>
  );
}

function EnvironmentTasks({
  environment,
  now,
  projectIds,
  onEdit,
}: {
  readonly environment: SettingsTarget;
  readonly now: number;
  readonly projectIds: readonly ProjectId[] | null;
  readonly onEdit: (task: ScheduledTask) => void;
}) {
  const { t, i18n } = useTranslation();
  const environmentId = environment.environmentId;
  const tasks = useEnvironmentQuery(
    serverEnvironment.scheduledTasksLive({ environmentId, input: {} }),
  );
  const visibleTasks = tasks.data?.tasks.filter(
    (task) => projectIds === null || projectIds.includes(task.projectId),
  );
  const canOperate = useAtomValue(
    serverEnvironment.upsertScheduledTask.permissionAtom(environmentId),
  );
  const setEnabled = useAtomCommand(serverEnvironment.setScheduledTaskEnabled, {
    label: "scheduled task enabled",
    reportFailure: false,
  });
  const runNow = useAtomCommand(serverEnvironment.runScheduledTaskNow, {
    label: "scheduled task run",
    reportFailure: false,
  });
  const remove = useAtomCommand(serverEnvironment.deleteScheduledTask, {
    label: "scheduled task delete",
    reportFailure: false,
  });
  const failure = (title: string, result: AtomCommandResult<unknown, unknown>) => {
    if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
      Dialog.alert(title, String(squashAtomCommandFailure(result)));
    }
  };

  const act = async (task: ScheduledTask, action: "run" | "toggle" | "delete") => {
    if (!readEnvironmentScope(environmentId, AuthOrchestrationOperateScope)) return;
    const result =
      action === "run"
        ? await runNow({ environmentId, input: { id: task.id } })
        : action === "toggle"
          ? await setEnabled({ environmentId, input: { id: task.id, enabled: !task.enabled } })
          : await remove({ environmentId, input: { id: task.id } });
    failure(
      t(
        action === "toggle"
          ? "mobile.schedule.updateFailed"
          : action === "run"
            ? "mobile.schedule.runFailed"
            : "mobile.schedule.deleteFailed",
      ),
      result,
    );
  };

  return (
    <SettingsSection
      title={environment.label}
      titleIcon={
        <EnvironmentMachineSymbol
          kind={resolveEnvironmentMachineKind(environment.serverConfig)}
          size={16}
          tintColorClassName={
            Platform.OS === "android" ? "accent-primary" : "accent-foreground-muted"
          }
        />
      }
    >
      {tasks.error ? (
        <Text className="p-4 text-base text-danger-foreground">{tasks.error}</Text>
      ) : !tasks.data ? (
        <Text className="p-4 text-base text-foreground-muted">
          {t("mobile.settings.SettingsScheduledTasksRouteScreen.loading-tasks")}
        </Text>
      ) : visibleTasks?.length === 0 ? (
        <Text className="p-4 text-base text-foreground-muted">
          {projectIds === null
            ? t("mobile.dynamic.SettingsScheduledTasksRouteScreen.no-scheduled-tasks-yet")
            : t("mobile.dynamic.SettingsScheduledTasksRouteScreen.no-tasks-in-this-project")}
        </Text>
      ) : (
        visibleTasks?.map((task, index) => (
          <View
            key={task.id}
            className={
              index === 0
                ? "flex-row items-start gap-1 px-4 py-3"
                : "flex-row items-start gap-1 border-t border-border-subtle px-4 py-3"
            }
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mobile.dynamic.SettingsScheduledTasksRouteScreen.edit-param", {
                title: task.title,
              })}
              onPress={() => {
                onEdit(task);
              }}
              className="min-w-0 flex-1 gap-1 active:opacity-70"
            >
              <Text textRole="body" className="text-foreground" numberOfLines={1}>
                {task.title}
              </Text>
              <Text className="text-sm text-foreground-muted" numberOfLines={2}>
                {describeSchedule(task, t, i18n.resolvedLanguage ?? "en")}
                {!task.enabled
                  ? ` · ${t("schedule.paused")}`
                  : task.nextRunAt
                    ? ` · ${formatNextScheduledTaskRun(task.nextRunAt, now, t, i18n.resolvedLanguage ?? "en")}`
                    : ""}
              </Text>
              {task.lastRunError ? (
                <Text className="text-sm text-danger-foreground" numberOfLines={2}>
                  {t("mobile.settings.dynamic.lastRunFailed", { error: task.lastRunError })}
                </Text>
              ) : null}
            </Pressable>
            <Menu
              actions={[
                { id: "edit", title: t("mobile.schedule.edit") },
                {
                  id: "toggle",
                  title: task.enabled ? t("mobile.schedule.pause") : t("mobile.schedule.resume"),
                  attributes: { disabled: !canOperate },
                },
                ...(task.schedule.type === "webhook"
                  ? []
                  : [
                      {
                        id: "run",
                        title: t("mobile.schedule.run"),
                        attributes: { disabled: !canOperate },
                      },
                    ]),
                {
                  id: "delete",
                  title: t("mobile.schedule.delete"),
                  attributes: { destructive: true, disabled: !canOperate },
                },
              ]}
              onPressAction={({ nativeEvent }) => {
                const action = nativeEvent.event;
                if (action === "edit") {
                  onEdit(task);
                } else if (action === "delete") {
                  Dialog.alert(t("mobile.schedule.deleteTitle"), task.title, [
                    { text: t("mobile.schedule.cancel"), style: "cancel" },
                    {
                      text: t("mobile.schedule.delete"),
                      style: "destructive",
                      onPress: () => void act(task, "delete"),
                    },
                  ]);
                } else if (action === "toggle" || action === "run") {
                  void act(task, action);
                }
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  "mobile.dynamic.SettingsScheduledTasksRouteScreen.actions-for-param",
                  { title: task.title },
                )}
                className="h-11 w-11 items-center justify-center"
              >
                <SymbolView
                  name="ellipsis"
                  size={18}
                  tintColorClassName="accent-icon"
                  type="monochrome"
                />
              </Pressable>
            </Menu>
          </View>
        ))
      )}
    </SettingsSection>
  );
}
