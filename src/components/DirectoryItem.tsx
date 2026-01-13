import { memo, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { DirectoryEntry } from "../types/interfaces";
import { formatRelativeTime, formatLastModifiedDate } from "../utilities/formatTime";
import { getProjectInfo } from "../utilities/pathParser";
import { DirectoryRow, DirectoryRowVariant } from "./DirectoryRow";
import { ContextMenu } from "./ContextMenu";
import { SelectionCheckbox } from "./SelectionCheckbox";
import { componentLogger } from "../utilities/logger";
import type { WarningItem } from "./InfoDialog";

interface DirectoryItemProps {
  entry: DirectoryEntry;
  isRescanning?: boolean;
  isDeleting?: boolean;
  isLast?: boolean;
  isSelected?: boolean;
  onToggleSelection?: ((path: string) => void) | undefined;
  onDelete: (path: string) => void;
  onRescan: (path: string) => void;
  onOpenFinder: (path: string) => void;
  onExploreFiles: (path: string) => void;
  onShowInfo?: ((warnings: WarningItem[]) => void) | undefined;
}

export const DirectoryItem = memo(function DirectoryItem({
  entry,
  isRescanning = false,
  isDeleting = false,
  isLast = false,
  isSelected = false,
  onToggleSelection,
  onDelete,
  onRescan,
  onOpenFinder,
  onExploreFiles,
  onShowInfo,
}: DirectoryItemProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { projectName, monorepoName } = getProjectInfo(entry.path);
  const isICloudOnly = entry.sizeBytes === 0 && entry.fileCount === 0;
  const hasWarnings = entry.hasOnlySymlinks || isICloudOnly;

  const handleInfoClick = useCallback((): void => {
    if (!onShowInfo) {
      return;
    }

    const warnings: WarningItem[] = [];

    if (isICloudOnly) {
      warnings.push({
        title: t("dialogs.icloudTitle"),
        message: t("dialogs.icloudMessage"),
      });
    }

    if (entry.hasOnlySymlinks) {
      warnings.push({
        title: t("dialogs.symlinkTitle"),
        message: t("dialogs.symlinkMessage"),
      });
    }

    if (warnings.length > 0) {
      onShowInfo(warnings);
    }
  }, [onShowInfo, isICloudOnly, entry.hasOnlySymlinks, t]);

  const handlePathClick = useCallback((): void => {
    onOpenFinder(entry.path);
  }, [onOpenFinder, entry.path]);

  const handleCopyPath = useCallback(async (): Promise<void> => {
    try {
      await writeText(entry.path);
    } catch (error) {
      componentLogger.error("Failed to copy path to clipboard:", error);
    }
  }, [entry.path]);

  const handleCheckboxChange = useCallback((): void => {
    if (onToggleSelection) {
      onToggleSelection(entry.path);
    }
  }, [onToggleSelection, entry.path]);

  const menuItems = useMemo(
    () => [
      {
        label: t("menu.copyPath"),
        onClick: handleCopyPath,
      },
      {
        label: t("menu.exploreFiles"),
        onClick: () => onExploreFiles(entry.path),
        disabled: entry.sizeBytes === 0,
      },
      {
        label: t("menu.rescanNow"),
        onClick: () => onRescan(entry.path),
      },
      {
        label: t("menu.openInFinder"),
        onClick: () => onOpenFinder(entry.path),
      },
      {
        label: t("menu.deleteDirectory"),
        onClick: () => onDelete(entry.path),
        variant: "danger" as const,
      },
    ],
    [entry.path, entry.sizeBytes, onDelete, onRescan, onOpenFinder, onExploreFiles, handleCopyPath, t]
  );

  const showLoadingState = isRescanning || isDeleting;
  const disableInteraction = isDeleting;

  return (
    <DirectoryRow
      variant={showLoadingState ? DirectoryRowVariant.LOADING : DirectoryRowVariant.DEFAULT}
      projectName={projectName}
      monorepoName={monorepoName}
      displayPath={entry.path}
      category={entry.category}
      sizeBytes={entry.sizeBytes}
      timeText={formatRelativeTime(entry.lastModifiedMs, t, i18n.language)}
      timeTooltip={formatLastModifiedDate(entry.lastModifiedMs, t, i18n.language)}
      checkboxSlot={
        onToggleSelection ? (
          <SelectionCheckbox
            checked={isSelected}
            onChange={handleCheckboxChange}
            disabled={disableInteraction}
          />
        ) : undefined
      }
      menuSlot={<ContextMenu items={menuItems} disabled={disableInteraction} />}
      isLast={isLast}
      hasWarnings={hasWarnings}
      onInfoClick={handleInfoClick}
      onPathClick={handlePathClick}
    />
  );
});
