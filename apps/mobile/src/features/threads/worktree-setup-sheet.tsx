import { useTranslate } from "../../i18n";
import type { ReactElement } from "react";
import { Sheet } from "../../components/ui/Sheet";

export interface WorktreeSetupSheetProps {
  children: ReactElement;
  height: number;
  onClose: () => void;
}

export function WorktreeSetupSheet({ children, onClose }: WorktreeSetupSheetProps) {
  const t = useTranslate();
  return (
    <Sheet title={t("mobile.threads.worktree-setup-sheet.worktree-setup")} onClose={onClose}>
      {children}
    </Sheet>
  );
}
