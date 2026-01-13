import { useMemo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { useDependencyStore } from "../stores/dependencyStore";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { DirectoryItem } from "./DirectoryItem";
import { RecentlyCheckedItem } from "./RecentlyCheckedItem";
import { AnimatedListItem } from "./AnimatedListItem";
import { ConfirmDialog } from "./ConfirmDialog";
import { InfoDialog } from "./InfoDialog";
import { ExploreFilesDialog } from "./ExploreFilesDialog";
import { SearchBox } from "./SearchBox";
import { ScanStatus } from "../types/scanStatus";
import type { DirectoryEntry } from "../types/interfaces";
import { DEPENDENCY_CATEGORY_SHORT_LABELS } from "../types/dependencyCategory";
import { sortDirectories } from "../utilities/sortDirectories";
import { filterRecentlyCheckedPaths } from "../utilities/pathFilters";
import { addToSet, removeFromSet } from "../utilities/setUtils";
import { useAnimatedList } from "../hooks/useAnimatedList";
import { componentLogger } from "../utilities/logger";

interface RecentlyCheckedPathItem {
  type: "recentlyChecked";
  path: string;
}

interface DirectoryEntryItem {
  type: "directory";
  entry: DirectoryEntry;
}

type ListItem = RecentlyCheckedPathItem | DirectoryEntryItem;

function getListItemKey(item: ListItem): string {
  if (item.type === "recentlyChecked") {
    return `recent-${item.path}`;
  }
  return `dir-${item.entry.path}`;
}

export function DirectoryList(): React.ReactElement {
  const { t } = useTranslation();
  const scanStatus = useDependencyStore((state) => state.scanStatus);
  const directories = useDependencyStore((state) => state.directories);
  const sortOrder = useDependencyStore((state) => state.sortOrder);
  const deleteDirectory = useDependencyStore((state) => state.deleteDirectory);
  const rescanDirectory = useDependencyStore((state) => state.rescanDirectory);
  const recentlyCheckedPaths = useDependencyStore(
    (state) => state.recentlyCheckedPaths
  );
  const confirmBeforeDelete = useDependencyStore(
    (state) => state.confirmBeforeDelete
  );
  const permanentDelete = useDependencyStore((state) => state.permanentDelete);
  const selectedPaths = useDependencyStore((state) => state.selectedPaths);
  const toggleSelection = useDependencyStore((state) => state.toggleSelection);
  const bulkDeletingPaths = useDependencyStore((state) => state.deletingPaths);

  const [rescanningPaths, setRescanningPaths] = useState<Set<string>>(
    new Set()
  );
  const [singleDeletingPaths, setSingleDeletingPaths] = useState<Set<string>>(
    new Set()
  );
  const [showInfo, setShowInfo] = useState(false);
  const [infoWarnings, setInfoWarnings] = useState<
    Array<{ title: string; message: string }>
  >([]);
  const [exploreFilesPath, setExploreFilesPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const confirmDialog = useConfirmDialog();

  const isScanning = scanStatus === ScanStatus.SCANNING;

  const filteredDirectories = useMemo(() => {
    if (!searchQuery.trim()) {
      return directories;
    }
    const query = searchQuery.toLowerCase();
    return directories.filter((directory) => {
      const pathMatches = directory.path.toLowerCase().includes(query);
      const categoryLabel = DEPENDENCY_CATEGORY_SHORT_LABELS[directory.category];
      const categoryMatches = categoryLabel.toLowerCase().includes(query);
      return pathMatches || categoryMatches;
    });
  }, [directories, searchQuery]);

  const displayDirectories = useMemo(
    () => sortDirectories({ directories: filteredDirectories, sortOrder }),
    [filteredDirectories, sortOrder]
  );

  const listItems = useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    const maxRecentlyCheckedRows = 2;

    if (isScanning) {
      const foundPaths = directories.map((directory) => directory.path);
      const filteredPaths = filterRecentlyCheckedPaths({
        recentlyCheckedPaths,
        foundDirectoryPaths: foundPaths,
      });

      const limitedPaths = filteredPaths.slice(0, maxRecentlyCheckedRows);
      for (const path of limitedPaths) {
        items.push({ type: "recentlyChecked", path });
      }
    }

    for (const entry of displayDirectories) {
      items.push({ type: "directory", entry });
    }

    return items;
  }, [isScanning, recentlyCheckedPaths, displayDirectories, directories]);

  const { animatedItems, handleExitComplete } = useAnimatedList({
    items: listItems,
    getKey: getListItemKey,
  });

  const handleDelete = useCallback(
    async (path: string): Promise<void> => {
      const entry = directories.find((directory) => directory.path === path);
      if (!entry) {
        return;
      }

      if (confirmBeforeDelete) {
        const messageKey = permanentDelete
          ? "dialogs.deletePermanentMessage"
          : "dialogs.deleteToTrashMessage";

        const confirmed = await confirmDialog.showConfirmDialog({
          title: t("dialogs.deleteDirectoryTitle"),
          message: t(messageKey),
          confirmLabel: t("dialogs.delete"),
          cancelLabel: t("dialogs.cancel"),
          directories: [{ path: entry.path, sizeBytes: entry.sizeBytes }],
        });

        if (!confirmed) {
          return;
        }
      }

      setSingleDeletingPaths((previous) => addToSet(previous, path));
      try {
        await deleteDirectory(path);
      } finally {
        setSingleDeletingPaths((previous) => removeFromSet(previous, path));
      }
    },
    [
      directories,
      confirmBeforeDelete,
      permanentDelete,
      confirmDialog,
      deleteDirectory,
      t,
    ]
  );

  const handleRescan = useCallback(
    async (path: string): Promise<void> => {
      setRescanningPaths((previous) => addToSet(previous, path));
      try {
        await rescanDirectory(path);
      } finally {
        setRescanningPaths((previous) => removeFromSet(previous, path));
      }
    },
    [rescanDirectory]
  );

  const handleOpenFinder = useCallback(async (path: string): Promise<void> => {
    try {
      await invoke("open_in_finder", { path });
    } catch (error) {
      componentLogger.error("Failed to open in Finder:", error);
    }
  }, []);

  const handleShowInfo = useCallback(
    (warnings: Array<{ title: string; message: string }>): void => {
      setInfoWarnings(warnings);
      setShowInfo(true);
    },
    []
  );

  const handleCloseInfo = useCallback((): void => {
    setShowInfo(false);
    setInfoWarnings([]);
  }, []);

  const handleExploreFiles = useCallback((path: string): void => {
    setExploreFilesPath(path);
  }, []);

  const handleCloseExploreFiles = useCallback((): void => {
    setExploreFilesPath(null);
  }, []);

  const hasSelection = selectedPaths.size > 0;
  const hasDirectories = directories.length > 0;
  const showCheckboxes = hasSelection || isScanning || hasDirectories;

  const handleSearchChange = useCallback((value: string): void => {
    setSearchQuery(value);
  }, []);

  return (
    <>
      <SearchBox value={searchQuery} onChange={handleSearchChange} />
      <div className="flex-1 overflow-y-scroll">
        {animatedItems.map((animated, index) => {
          const isLast = index === animatedItems.length - 1;
          return (
            <AnimatedListItem
              key={animated.key}
              isExiting={animated.isExiting}
              onExitComplete={() => handleExitComplete(animated.key)}
            >
              {animated.item.type === "recentlyChecked" ? (
                <RecentlyCheckedItem
                  path={animated.item.path}
                  isLast={isLast}
                  showCheckbox={showCheckboxes}
                />
              ) : (
                <DirectoryItem
                  entry={animated.item.entry}
                  isRescanning={rescanningPaths.has(animated.item.entry.path)}
                  isDeleting={
                    singleDeletingPaths.has(animated.item.entry.path) ||
                    bulkDeletingPaths.has(animated.item.entry.path)
                  }
                  isLast={isLast}
                  isSelected={selectedPaths.has(animated.item.entry.path)}
                  onToggleSelection={
                    showCheckboxes ? toggleSelection : undefined
                  }
                  onDelete={handleDelete}
                  onRescan={handleRescan}
                  onOpenFinder={handleOpenFinder}
                  onExploreFiles={handleExploreFiles}
                  onShowInfo={handleShowInfo}
                />
              )}
            </AnimatedListItem>
          );
        })}
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
      {showInfo && (
        <InfoDialog
          title={t("dialogs.directoryWarningsTitle")}
          warnings={infoWarnings}
          onClose={handleCloseInfo}
        />
      )}
      {exploreFilesPath !== null && (
        <ExploreFilesDialog
          directoryPath={exploreFilesPath}
          onClose={handleCloseExploreFiles}
        />
      )}
    </>
  );
}
