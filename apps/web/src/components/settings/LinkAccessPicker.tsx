import { Trans } from "react-i18next";
import { runtimeModeText } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../i18n";
import { AuthMcpClientAccess } from "@t3tools/contracts";
import { useId } from "react";

import { accessConfig } from "../auth/ConnectAgentSurface";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";

/** What agents here may do in an environment being linked, with what that does not allow. */
export function LinkAccessPicker({
  value,
  onChange,
  disabled = false,
}: {
  readonly value: AuthMcpClientAccess;
  readonly onChange: (access: AuthMcpClientAccess) => void;
  readonly disabled?: boolean;
}) {
  const t = useTranslate();
  const labelId = useId();
  const selected = { ...accessConfig[value], ...runtimeModeText(t, value) };
  return (
    <div className="space-y-1.5">
      <span id={labelId} className="block text-xs font-medium">
        {t("settings.pages.LinkAccessPicker.what-agents-here-may-do-there")}
      </span>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next !== null) onChange(next as AuthMcpClientAccess);
        }}
      >
        <SelectTrigger aria-labelledby={labelId}>
          <SelectValue>
            <span className="flex items-center gap-2">
              <selected.icon aria-hidden className="size-4" />
              {selected.label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectPopup alignItemWithTrigger={false}>
          {AuthMcpClientAccess.literals.map((option) => {
            const { label, description } = runtimeModeText(t, option);
            const Icon = accessConfig[option].icon;
            return (
              <SelectItem key={option} value={option} hideIndicator>
                <span className="grid min-w-0 gap-0.5 py-0.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                    {label}
                  </span>
                  <span className="text-xs leading-4 text-muted-foreground">{description}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectPopup>
      </Select>
      <p className="text-xs text-muted-foreground">
        <Trans
          t={t}
          i18nKey="web.rich.LinkAccessPicker.part-an-agent-never-gets-more-access-there-than-its-own-mode-here-below-full-access-it-can-change-only-threads-this-link-started-not-that-machine-s-own-threads-projects-or-settings"
          components={{ value0: <>{selected.description}</> }}
        />
      </p>
    </div>
  );
}
