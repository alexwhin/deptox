import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { Text, TextVariant, TextIntent } from "./Typography";
import { Button, ButtonVariant } from "./Button";
import { MiniTable } from "./MiniTable";
import { DialogOverlay, DialogSize } from "./DialogOverlay";
import type { MiniTableItem } from "./MiniTable";
import type { LargestFilesResult, FileEntry } from "../types/interfaces";
import { componentLogger } from "../utilities/logger";
import { getRelativePath, getParentDirectory } from "../utilities/pathUtils";

const PLACEHOLDER_COUNT = 8;

interface ExploreFilesDialogProps {
  directoryPath: string;
  onClose: () => void;
}

export function ExploreFilesDialog({
  directoryPath,
  onClose,
}: ExploreFilesDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<LargestFilesResult>("get_largest_files", {
        path: directoryPath,
      });
      setFiles(result.files);
    } catch (invokeError) {
      componentLogger.error("Failed to load largest files:", invokeError);
      setError(t("menu.failedToLoadFiles"));
    } finally {
      setIsLoading(false);
    }
  }, [directoryPath, t]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (!isLoading) {
      closeButtonRef.current?.focus();
    }
  }, [isLoading]);

  const handleOpenFileLocation = useCallback(async (filePath: string): Promise<void> => {
    try {
      const parentDir = getParentDirectory(filePath);
      await invoke("open_in_finder", { path: parentDir });
    } catch (openError) {
      componentLogger.error("Failed to open file location in Finder:", openError);
    }
  }, []);

  const handleRescan = useCallback((): void => {
    loadFiles();
  }, [loadFiles]);

  return (
    <DialogOverlay
      onClose={onClose}
      ariaLabelledBy="explore-files-dialog-title"
      size={DialogSize.MEDIUM}
      noPadding={true}
    >
      <div className="px-4 pt-4 pb-1">
        <Text
          variant={TextVariant.TITLE}
          as="h2"
          id="explore-files-dialog-title"
        >
          {t("menu.largestFiles")}
        </Text>
      </div>

      <div className="px-4 pb-4">
        {error && (
          <div className="py-8 text-center">
            <Text variant={TextVariant.CAPTION} intent={TextIntent.DANGER}>
              {error}
            </Text>
          </div>
        )}

        {!error && (
          <MiniTable
            items={files.map((file): MiniTableItem => ({
              path: getRelativePath(file.path, directoryPath),
              sizeBytes: file.sizeBytes,
            }))}
            isLoading={isLoading}
            placeholderCount={PLACEHOLDER_COUNT}
            emptyMessage={t("menu.noFilesFound")}
            onItemClick={(relativePath) => {
              const fullPath = `${directoryPath}/${relativePath}`;
              handleOpenFileLocation(fullPath);
            }}
          />
        )}
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <Button
          ref={closeButtonRef}
          variant={ButtonVariant.SECONDARY}
          fullWidth={true}
          onClick={onClose}
          aria-label={t("settings.close")}
        >
          {t("settings.close")}
        </Button>
        <Button
          variant={ButtonVariant.PRIMARY}
          fullWidth={true}
          onClick={isLoading ? undefined : handleRescan}
          disabled={isLoading}
          aria-label={isLoading ? t("scan.scanning") : t("menu.rescan")}
        >
          {isLoading ? t("scan.scanning") : t("menu.rescan")}
        </Button>
      </div>
    </DialogOverlay>
  );
}
