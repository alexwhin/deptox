import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDependencyStore } from "../stores/dependencyStore";
import { ScanStatus } from "../types/scanStatus";
import { Button, ButtonVariant } from "./Button";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { cn } from "../utilities/cn";

export function Footer(): React.ReactElement {
  const { t } = useTranslation();
  const startScan = useDependencyStore((state) => state.startScan);
  const scanStatus = useDependencyStore((state) => state.scanStatus);
  const selectedPaths = useDependencyStore((state) => state.selectedPaths);
  const deleteSelectedDirectories = useDependencyStore((state) => state.deleteSelectedDirectories);
  const directories = useDependencyStore((state) => state.directories);
  const confirmBeforeDelete = useDependencyStore((state) => state.confirmBeforeDelete);
  const permanentDelete = useDependencyStore((state) => state.permanentDelete);
  const deletingPaths = useDependencyStore((state) => state.deletingPaths);

  const confirmDialog = useConfirmDialog();

  const isScanning = scanStatus === ScanStatus.SCANNING;
  const selectionCount = selectedPaths.size;
  const hasSelection = selectionCount > 0;
  const isDeleting = deletingPaths.size > 0;

  const handleScan = useCallback(async (): Promise<void> => {
    await startScan();
  }, [startScan]);

  const handleBulkDelete = useCallback(async (): Promise<void> => {
    if (confirmBeforeDelete) {
      const selectedEntries = directories.filter((directory) =>
        selectedPaths.has(directory.path)
      );
      const directoryInfos = selectedEntries.map((entry) => ({
        path: entry.path,
        sizeBytes: entry.sizeBytes,
      }));
      const titleKey = selectionCount === 1 ? "dialogs.deleteDirectoryTitle" : "dialogs.deleteDirectoriesTitle";
      const messageKey = permanentDelete
        ? "dialogs.deletePermanentMessage"
        : "dialogs.deleteToTrashMessage";

      const confirmed = await confirmDialog.showConfirmDialog({
        title: t(titleKey, { count: selectionCount }),
        message: t(messageKey),
        confirmLabel: t("dialogs.delete"),
        cancelLabel: t("dialogs.cancel"),
        directories: directoryInfos,
      });

      if (!confirmed) {
        return;
      }
    }

    await deleteSelectedDirectories();
  }, [
    confirmBeforeDelete,
    permanentDelete,
    directories,
    selectedPaths,
    selectionCount,
    confirmDialog,
    deleteSelectedDirectories,
    t,
  ]);

  return (
    <>
      <div className="shrink-0 p-3 bg-surface-raised-light dark:bg-surface-raised/50 border-t border-surface-border-light dark:border-surface-border flex gap-2">
        <Button
          variant={ButtonVariant.PRIMARY}
          fullWidth={true}
          onClick={handleScan}
          loading={isScanning}
          disabled={isDeleting}
        >
          {t("scan.button")}
        </Button>
        {hasSelection && (
          <div
            className={cn(
              "overflow-hidden transition-[width] duration-200 ease-in-out",
              hasSelection ? "w-full" : "w-0"
            )}
          >
            <div
              className={cn(
                "transition-opacity duration-150",
                hasSelection ? "delay-200 opacity-100" : "opacity-0"
              )}
            >
              <Button
                variant={ButtonVariant.DANGER}
                fullWidth={true}
                onClick={handleBulkDelete}
                loading={isDeleting}
              >
                {t("delete.button", { count: selectionCount })}
              </Button>
            </div>
          </div>
        )}
      </div>
      {confirmDialog.isOpen && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          directories={confirmDialog.directories}
          onConfirm={confirmDialog.handleConfirm}
          onCancel={confirmDialog.handleCancel}
        />
      )}
    </>
  );
}
