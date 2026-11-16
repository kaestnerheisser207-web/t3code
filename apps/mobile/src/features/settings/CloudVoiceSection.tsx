import { useTranslate } from "../../i18n";
import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { setCloudSpeechKey } from "@t3tools/client-runtime/voice-input";
import {
  configuredSecretSources,
  secretRequestReference,
} from "@t3tools/client-runtime/secret-request";
import {
  AuthSettingsWriteScope,
  CLOUD_SPEECH_LABELS,
  CLOUD_SPEECH_PROVIDER_NAMES,
  CloudSpeechProvider,
  CloudSpeechApiKey,
  CloudSpeechModelId,
  isSecretReference,
  type CloudSpeechModel,
  type SecretProviderId,
  type SettingsSecretValue,
  type VoiceTranscriptionDestination,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import Constants from "expo-constants";
import { AsyncResult } from "effect/reactivity";
import { type ReactNode, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { Sheet } from "../../components/ui/Sheet";
import * as Dialog from "../../components/ui/Dialog";
import { ProviderIcon } from "../../components/ProviderIcon";
import { AppText as Text } from "../../components/ui/AppText";
import { ListActionRow } from "../../components/ui/ListActionRow";
import { ListChoiceRow } from "../../components/ui/ListChoiceRow";
import { Chip } from "../../components/ui/Chip";
import { ListSection } from "../../components/ui/ListSection";
import type { EnvironmentPresentation } from "../../state/environments";
import { useEnvironmentScope } from "../../state/session";
import {
  chooseVoiceDestination,
  pendingCloudVoiceChoice,
  cloudVoiceConnectionAtom,
  cloudVoiceKeysAtom,
  cloudVoiceModelsAtom,
  runSpeech,
} from "../voice-input/voiceDestination";

type CloudDestination = Extract<VoiceTranscriptionDestination, { kind: "cloud" }>;
type Props = { environment: EnvironmentPresentation; active: CloudDestination | null };
const isApiKey = Schema.is(CloudSpeechApiKey);
const isModelId = Schema.is(CloudSpeechModelId);
const MODEL_ROWS = 6;

/** The cloud method row for one environment; opens the provider sheet. */
export function CloudVoiceChoice({
  environment,
  active,
  open,
  onOpenChange,
}: Props & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslate();
  const usable = useAtomValue(cloudVoiceConnectionAtom(environment.environmentId)) !== null;
  return (
    <>
      <ListChoiceRow
        label={t("release4761.text044")}
        description={
          active
            ? `${CLOUD_SPEECH_LABELS[active.provider]}${active.provider === "openrouter" ? ` · ${active.model}` : ""}`
            : usable
              ? "Use your own API key"
              : "Not connected"
        }
        selected={active !== null}
        disabled={!usable}
        separated
        onPress={() => onOpenChange(true)}
      />
      {open && (
        <CloudChoices
          environment={environment}
          active={active}
          onClose={() => onOpenChange(false)}
        />
      )}
    </>
  );
}

function ModelPicker({
  models,
  value,
  current,
  disabled,
  onChange,
}: {
  models: ReadonlyArray<CloudSpeechModel>;
  value: string;
  /** The grant's model, flagged when the catalog no longer lists it. */
  current: string | undefined;
  disabled: boolean;
  onChange: (model: CloudSpeechModelId) => void;
}) {
  const t = useTranslate();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const needle = query.trim().toLowerCase();
  const selected = models.find((model) => model.id === value);
  const matches = models.filter((model) =>
    `${model.name} ${model.id}`.toLowerCase().includes(needle),
  );
  const shown = showAll ? matches : matches.slice(0, MODEL_ROWS);
  const delisted = current !== undefined && !models.some((model) => model.id === current);
  return (
    <ListSection
      title={t("release4340.step-model")}
      footer={delisted ? t("release4340.openrouter-delisted", { model: current }) : undefined}
    >
      <View className="px-4 py-3">
        <TextInput
          accessibilityLabel={t("release4340.search-openrouter-models")}
          placeholder={t("release4262.search-transcription-models")}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          value={query}
          onChangeText={setQuery}
          className="rounded-lg bg-background px-3 py-2 text-foreground"
        />
      </View>
      {selected && !shown.some((model) => model.id === selected.id) ? (
        <ListChoiceRow
          label={selected.name}
          description={selected.id}
          selected
          separated
          disabled={disabled}
          onPress={() => {}}
        />
      ) : null}
      {shown.map((model) => (
        <ListChoiceRow
          key={model.id}
          label={model.name}
          description={model.id}
          selected={model.id === value}
          separated
          disabled={disabled}
          onPress={() => onChange(model.id)}
        />
      ))}
      {matches.length === 0 ? (
        <Separated>
          <Text className="px-4 py-3 text-sm text-foreground-muted">
            {t("release4340.no-transcription-model-matches")}
          </Text>
        </Separated>
      ) : matches.length > shown.length ? (
        <Separated>
          <ListActionRow
            label={t("release4340.show-all-models", { count: matches.length })}
            onPress={() => setShowAll(true)}
          />
        </Separated>
      ) : null}
    </ListSection>
  );
}

/** A hairline above a row that has no `separated` prop of its own. */
function Separated({ children }: { children: ReactNode }) {
  return <View className="border-t border-border-subtle">{children}</View>;
}

function CloudChoices({ environment, active, onClose }: Props & { onClose: () => void }) {
  const t = useTranslate();
  const id = environment.environmentId;
  const connection = useAtomValue(cloudVoiceConnectionAtom(id));
  const keys = useAtomValue(cloudVoiceKeysAtom(id));
  const reload = useAtomRefresh(cloudVoiceKeysAtom(id));
  const canManage = useEnvironmentScope(id, AuthSettingsWriteScope);
  const [editing, setEditing] = useState<{
    provider: CloudSpeechProvider;
    enable: boolean;
  } | null>(null);
  const catalogAtom = cloudVoiceModelsAtom(editing?.provider === "openrouter" ? id : null);
  const models = useAtomValue(catalogAtom);
  const reloadModels = useAtomRefresh(catalogAtom);
  const [draft, setDraft] = useState("");
  const [model, setModel] = useState("");
  const [sourceId, setSourceId] = useState<SecretProviderId | null>(null);
  const sources =
    Constants.expoConfig?.extra?.secretsFeatureEnabled === true &&
    environment.serverConfig?.secretReferences
      ? configuredSecretSources(environment.serverConfig.settings.secretProviders)
      : [];
  const source = sources.find((candidate) => candidate.id === sourceId);
  const credential =
    sourceId !== null
      ? source && secretRequestReference(source, draft)
      : isApiKey(draft.trim())
        ? draft.trim()
        : undefined;
  const [saving, setSaving] = useState(false);
  const activeModel = active?.provider === "openrouter" ? active.model : undefined;
  const enable = (commit: () => void) => {
    try {
      commit();
    } catch {
      Dialog.alert(
        t("release4340.enable-cloud-failed"),
        t("release4340.enable-cloud-failed-detail"),
      );
    }
  };
  const edit = (provider: CloudSpeechProvider, enable: boolean) => {
    const stored = environment.serverConfig?.settings.cloudSpeechCredentials?.[provider];
    const ref =
      isSecretReference(stored) && sources.some((candidate) => candidate.id === stored.provider)
        ? stored
        : null;
    setSourceId(ref?.provider ?? null);
    setDraft(ref?.reference ?? "");
    setModel(provider === "openrouter" ? (activeModel ?? "") : "");
    setEditing({ provider, enable });
  };
  const reset = () => {
    setDraft("");
    setModel("");
    setEditing(null);
  };
  const changeKey = async (
    provider: CloudSpeechProvider,
    value: SettingsSecretValue | null,
    chosen?: CloudSpeechModelId,
  ) => {
    if (!connection || !canManage || saving) return;
    const commit =
      value !== null && (editing?.enable || (chosen !== undefined && chosen !== activeModel))
        ? pendingCloudVoiceChoice(id, provider, chosen)
        : null;
    setSaving(true);
    try {
      await runSpeech(setCloudSpeechKey(connection, provider, value));
    } catch {
      setSaving(false);
      Dialog.alert(t("release4340.update-key-failed"), t("release4340.update-key-failed-detail"));
      return;
    }
    setSaving(false);
    if (commit) enable(commit);
    reload();
    onClose();
  };
  const catalog = AsyncResult.isSuccess(models) ? (models.value?.models ?? null) : null;
  const content = (() => {
    if (!AsyncResult.isSuccess(keys) || !keys.value || !connection)
      return (
        <ListSection>
          <ListActionRow
            label={
              !connection
                ? t("release4340.environment-not-connected")
                : keys._tag === "Failure"
                  ? t("release4340.load-keys-retry")
                  : t("release4340.checking-api-keys")
            }
            disabled={!connection || keys._tag !== "Failure"}
            onPress={reload}
          />
        </ListSection>
      );
    const saved = keys.value;
    if (!editing)
      return (
        <ListSection footer={`Audio is sent through ${environment.label} using its API key.`}>
          {CloudSpeechProvider.literals.map((provider, index) => {
            const label = CLOUD_SPEECH_LABELS[provider];
            const routed = provider === "openrouter";
            const key = saved[provider];
            const isActive = active?.provider === provider;
            return (
              <ListChoiceRow
                key={provider}
                label={label}
                leading={
                  <ProviderIcon
                    provider={
                      provider === "openai" ? "codex" : provider === "xai" ? "grok" : provider
                    }
                    size={20}
                  />
                }
                selected={isActive}
                separated={index > 0}
                disabled={key === undefined || (!key && !canManage) || saving}
                description={
                  key === undefined
                    ? t("release4340.update-env-for-provider")
                    : isActive && routed
                      ? t(
                          canManage
                            ? "release4340.tap-change-model-or-key"
                            : "release4340.tap-change-model",
                          { model: activeModel ?? "" },
                        )
                      : isActive && key && canManage
                        ? t("release4340.tap-manage-key")
                        : key
                          ? routed
                            ? t("release4340.key-saved-choose-model")
                            : "API key saved"
                          : canManage
                            ? t("release4340.add-key-for-provider")
                            : t("release4340.ask-env-admin-add-key")
                }
                onPress={() => {
                  if (routed) return edit(provider, !isActive);
                  if (!key) return edit(provider, true);
                  if (isActive) {
                    if (canManage) edit(provider, false);
                    return;
                  }
                  Dialog.confirm({
                    title: t("release4340.use-for-dictation", { name: label }),
                    message: t("release4340.disclosure-stop-sharing", {
                      disclosure: t("release4340.cloud-disclosure-provider", {
                        company: CLOUD_SPEECH_PROVIDER_NAMES[provider],
                        environment: environment.label,
                      }),
                    }),
                    confirmText: t("release4340.use-name", { name: label }),
                    onConfirm: () => enable(pendingCloudVoiceChoice(id, provider)),
                  });
                }}
              />
            );
          })}
        </ListSection>
      );

    const provider = editing.provider;
    const label = CLOUD_SPEECH_LABELS[provider];
    const company = CLOUD_SPEECH_PROVIDER_NAMES[provider];
    const routed = provider === "openrouter";
    const disclosure = routed
      ? t("release4340.cloud-disclosure-openrouter", { environment: environment.label })
      : t("release4340.cloud-disclosure-provider", { environment: environment.label, company });
    const key = saved[provider];
    const isActive = active?.provider === provider;
    const modelChosen = isModelId(model) && (catalog?.some((entry) => entry.id === model) ?? false);
    const modelChanged = model !== (activeModel ?? "");
    const original = environment.serverConfig?.settings.cloudSpeechCredentials?.[provider];
    const keyChanged =
      credential !== undefined &&
      !(
        isSecretReference(credential) &&
        isSecretReference(original) &&
        original.provider === credential.provider &&
        original.reference === credential.reference
      );
    const routedReady =
      modelChosen &&
      (draft.trim() ? credential !== undefined : Boolean(key)) &&
      (!isActive || modelChanged || keyChanged);
    const saveRouted = () => {
      if (!routedReady || !isModelId(model)) return;
      const grantChanges = !isActive || modelChanged;
      if (credential !== undefined && keyChanged)
        return void changeKey(provider, credential, model);
      // Model-only changes never write to the environment.
      if (grantChanges) enable(() => chooseVoiceDestination(id, provider, model));
      onClose();
    };
    const submit = () => {
      if (routed) saveRouted();
      else if (credential) void changeKey(provider, credential);
    };
    const keyFooter =
      draft && !credential
        ? (source?.invalidReferenceMessage ?? t("release4340.enter-valid-api-key"))
        : routed
          ? key && !credential
            ? t("release4340.uses-saved-key-model-device")
            : t("release4340.anyone-can-bill-key", {
                environment: environment.label,
              })
          : editing.enable
            ? t("release4340.anyone-can-bill-key", { environment: environment.label })
            : t("release4340.updates-company-key", {
                company: company,
                environment: environment.label,
              });
    return (
      <>
        <Text className="px-2 text-sm text-foreground-muted">{disclosure}</Text>
        {routed ? (
          catalog ? (
            <ModelPicker
              models={catalog}
              value={model}
              current={activeModel}
              disabled={saving}
              onChange={setModel}
            />
          ) : (
            <ListSection title={t("release4340.step-model")}>
              <ListActionRow
                label={
                  AsyncResult.isFailure(models)
                    ? t("release4340.load-models-retry")
                    : t("release4340.loading-transcription-models")
                }
                disabled={!AsyncResult.isFailure(models)}
                onPress={reloadModels}
              />
            </ListSection>
          )
        ) : null}
        {canManage ? (
          <ListSection title={t("release4340.api-key")} footer={keyFooter}>
            <View className="gap-3 px-4 py-3">
              {sources.length > 0 && (
                <View className="flex-row flex-wrap gap-2">
                  <Chip
                    label={t("release4340.value")}
                    size="small"
                    selected={sourceId === null}
                    disabled={saving}
                    onPress={() => {
                      setDraft("");
                      setSourceId(null);
                    }}
                  />
                  {sources.map((candidate) => (
                    <Chip
                      key={candidate.id}
                      label={candidate.label}
                      size="small"
                      selected={sourceId === candidate.id}
                      disabled={saving}
                      onPress={() => {
                        setDraft("");
                        setSourceId(candidate.id);
                      }}
                    />
                  ))}
                </View>
              )}
              <TextInput
                key={sourceId ?? "literal"}
                accessibilityLabel={
                  sourceId
                    ? t("release4340.company-api-key-reference", { company: label })
                    : t("release4340.company-api-key", { company: label })
                }
                placeholder={
                  source?.referencePlaceholder ??
                  (key ? t("release4340.saved-key-enter-new") : t("release4340.api-key"))
                }
                secureTextEntry={sourceId === null}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
                maxLength={4096}
                editable={!saving}
                returnKeyType="done"
                onSubmitEditing={submit}
                value={draft}
                onChangeText={setDraft}
                className="rounded-lg bg-background px-3 py-2 text-foreground"
              />
            </View>
          </ListSection>
        ) : null}
        {canManage || routed ? (
          <ListSection>
            {routed && !key && !canManage ? (
              <ListActionRow
                label={t("release4340.ask-admin-openrouter-key")}
                disabled
                onPress={() => {}}
              />
            ) : (
              <ListActionRow
                label={
                  routed
                    ? isActive
                      ? t("modelFilter.save")
                      : t("release4340.save-and-enable")
                    : editing.enable
                      ? t("release4340.save-and-enable")
                      : t("release4340.save-key")
                }
                loading={saving}
                disabled={routed ? !routedReady : !credential}
                onPress={submit}
              />
            )}
            {key && canManage ? (
              <Separated>
                <ListActionRow
                  tone="danger"
                  label={t("release4340.remove-key-from-environment")}
                  disabled={saving}
                  onPress={() =>
                    Dialog.confirm({
                      title: t("release4340.remove-key-from-env-title", {
                        name: label,
                        environment: environment.label,
                      }),
                      message: t("release4340.remove-key-lose-access"),
                      confirmText: t("release4340.remove-key"),
                      destructive: true,
                      onConfirm: () => void changeKey(provider, null),
                    })
                  }
                />
              </Separated>
            ) : null}
          </ListSection>
        ) : null}
        <ListSection>
          <ListActionRow
            label={t("release4340.back-to-providers")}
            disabled={saving}
            onPress={reset}
          />
        </ListSection>
      </>
    );
  })();
  return (
    <Sheet
      title={editing ? CLOUD_SPEECH_LABELS[editing.provider] : t("release4340.cloud-providers")}
      onClose={onClose}
      dismissDisabled={saving}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-4 px-5 pt-2 pb-8"
      >
        {content}
      </ScrollView>
    </Sheet>
  );
}
