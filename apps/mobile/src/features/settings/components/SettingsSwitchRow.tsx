import { managedPolicyText } from "@t3tools/client-runtime/i18n";
import { useTranslate } from "../../../i18n";
import type { ComponentProps } from "react";

import { ListToggleRow } from "../../../components/ui/ListToggleRow";

export function SettingsSwitchRow({
  subtitle,
  ...props
}: Omit<ComponentProps<typeof ListToggleRow>, "description"> & {
  readonly subtitle?: string;
}) {
  const t = useTranslate();
  return (
    <ListToggleRow
      {...props}
      description={subtitle === undefined ? undefined : managedPolicyText(t, subtitle)}
    />
  );
}
