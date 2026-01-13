import { useState, useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";
import { Icon, IconSize } from "./Icon";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useDependencyStore } from "../stores/dependencyStore";
import { BYTES_PER_GB, BYTES_PER_MB, SCAN } from "../utilities/constants";
import { componentLogger } from "../utilities/logger";
import {
  DependencyCategory,
  ALL_DEPENDENCY_CATEGORIES,
  DEPENDENCY_CATEGORY_LABELS,
} from "../types/dependencyCategory";
import {
  RescanInterval,
  ALL_RESCAN_INTERVALS,
  RESCAN_INTERVAL_LABELS,
} from "../types/rescanInterval";
import {
  SortOrder,
  ALL_SORT_ORDERS,
  SORT_ORDER_LABELS,
} from "../types/sortOrder";
import {
  FontSize,
  ALL_FONT_SIZES,
  FONT_SIZE_LABELS,
} from "../types/fontSize";
import { Input, InputVariant } from "./Input";
import { Select } from "./Select";
import { Checkbox, type CheckboxColor } from "./Checkbox";
import { FormField } from "./FormField";
import { languages } from "../i18n";

const CATEGORY_COLORS: Record<DependencyCategory, CheckboxColor> = {
  [DependencyCategory.NODE_MODULES]: "node",
  [DependencyCategory.COMPOSER]: "composer",
  [DependencyCategory.BUNDLER]: "bundler",
  [DependencyCategory.PODS]: "pods",
  [DependencyCategory.PYTHON_VENV]: "venv",
  [DependencyCategory.ELIXIR_DEPS]: "elixir",
  [DependencyCategory.DART_TOOL]: "dart",
  [DependencyCategory.GO_MOD]: "go",
};

interface SettingsPageProps {
  onClose: () => void;
}

export function SettingsPage({
  onClose,
}: SettingsPageProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const thresholdBytes = useDependencyStore((state) => state.thresholdBytes);
  const rootDirectory = useDependencyStore((state) => state.rootDirectory);
  const enabledCategories = useDependencyStore(
    (state) => state.enabledCategories
  );
  const minSizeBytes = useDependencyStore((state) => state.minSizeBytes);
  const permanentDelete = useDependencyStore((state) => state.permanentDelete);
  const excludePaths = useDependencyStore((state) => state.excludePaths);
  const rescanInterval = useDependencyStore((state) => state.rescanInterval);
  const confirmBeforeDelete = useDependencyStore(
    (state) => state.confirmBeforeDelete
  );
  const setThreshold = useDependencyStore((state) => state.setThreshold);
  const setRootDirectory = useDependencyStore(
    (state) => state.setRootDirectory
  );
  const toggleCategory = useDependencyStore((state) => state.toggleCategory);
  const setMinSize = useDependencyStore((state) => state.setMinSize);
  const setPermanentDelete = useDependencyStore(
    (state) => state.setPermanentDelete
  );
  const setExcludePaths = useDependencyStore((state) => state.setExcludePaths);
  const setRescanInterval = useDependencyStore(
    (state) => state.setRescanInterval
  );
  const setConfirmBeforeDelete = useDependencyStore(
    (state) => state.setConfirmBeforeDelete
  );
  const notifyOnThresholdExceeded = useDependencyStore(
    (state) => state.notifyOnThresholdExceeded
  );
  const setNotifyOnThresholdExceeded = useDependencyStore(
    (state) => state.setNotifyOnThresholdExceeded
  );
  const sortOrder = useDependencyStore((state) => state.sortOrder);
  const setSortOrder = useDependencyStore((state) => state.setSortOrder);
  const fontSize = useDependencyStore((state) => state.fontSize);
  const setFontSize = useDependencyStore((state) => state.setFontSize);
  const startScan = useDependencyStore((state) => state.startScan);

  const [localRootDirectory, setLocalRootDirectory] = useState(rootDirectory);
  const [localThresholdGigabytes, setLocalThresholdGigabytes] = useState(
    String(Math.round(thresholdBytes / BYTES_PER_GB))
  );
  const [localMinSizeMegabytes, setLocalMinSizeMegabytes] = useState(
    String(Math.round(minSizeBytes / BYTES_PER_MB))
  );
  const [localExcludePaths, setLocalExcludePaths] = useState(excludePaths);
  const [launchAtLogin, setLaunchAtLogin] = useState(true);

  const { trigger: triggerDebouncedScan } = useDebouncedCallback({
    callback: () => {
      startScan();
    },
    delayMs: SCAN.DEBOUNCE_MS,
  });

  useEffect(() => {
    invoke<boolean>("get_autostart_enabled")
      .then((enabled) => {
        setLaunchAtLogin(enabled);
      })
      .catch((error) => {
        componentLogger.error("Failed to get autostart status:", error);
      });
  }, []);

  useEffect(() => {
    return () => {
      const thresholdValue = parseInt(localThresholdGigabytes, 10);
      if (!isNaN(thresholdValue) && thresholdValue >= 1) {
        const newThresholdBytes = thresholdValue * BYTES_PER_GB;
        if (newThresholdBytes !== thresholdBytes) {
          setThreshold(newThresholdBytes);
        }
      }

      const minSizeValue = parseInt(localMinSizeMegabytes, 10);
      if (!isNaN(minSizeValue) && minSizeValue >= 0) {
        const newMinSizeBytes = minSizeValue * BYTES_PER_MB;
        if (newMinSizeBytes !== minSizeBytes) {
          setMinSize(newMinSizeBytes);
        }
      }
    };
  }, [localThresholdGigabytes, localMinSizeMegabytes, thresholdBytes, minSizeBytes, setThreshold, setMinSize]);

  useEscapeKey({ onEscape: onClose });

  const handleThresholdChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setLocalThresholdGigabytes(event.target.value);
  };

  const handleThresholdBlur = async (): Promise<void> => {
    const parsedValue = parseInt(localThresholdGigabytes, 10);
    if (isNaN(parsedValue) || parsedValue < 1) {
      setLocalThresholdGigabytes(String(Math.round(thresholdBytes / BYTES_PER_GB)));
      return;
    }
    const newThresholdBytes = parsedValue * BYTES_PER_GB;
    if (newThresholdBytes !== thresholdBytes) {
      await setThreshold(newThresholdBytes);
    }
  };

  const handleThresholdKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const handleMinSizeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setLocalMinSizeMegabytes(event.target.value);
  };

  const handleMinSizeBlur = async (): Promise<void> => {
    const parsedValue = parseInt(localMinSizeMegabytes, 10);
    if (isNaN(parsedValue) || parsedValue < 0) {
      setLocalMinSizeMegabytes(String(Math.round(minSizeBytes / BYTES_PER_MB)));
      return;
    }
    const newMinSizeBytes = parsedValue * BYTES_PER_MB;
    if (newMinSizeBytes !== minSizeBytes) {
      await setMinSize(newMinSizeBytes);
      triggerDebouncedScan();
    }
  };

  const handleMinSizeKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const handleExcludePathsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setLocalExcludePaths(event.target.value);
  };

  const handleExcludePathsBlur = async (): Promise<void> => {
    if (localExcludePaths !== excludePaths) {
      await setExcludePaths(localExcludePaths);
      triggerDebouncedScan();
    }
  };

  const handleExcludePathsKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const handleRootDirectoryChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setLocalRootDirectory(event.target.value);
  };

  const handleRootDirectoryBlur = async (): Promise<void> => {
    if (localRootDirectory !== rootDirectory) {
      await setRootDirectory(localRootDirectory);
      triggerDebouncedScan();
    }
  };

  const handleRootDirectoryKeyDown = async (
    event: React.KeyboardEvent<HTMLInputElement>
  ): Promise<void> => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const handleBrowseFolder = async (): Promise<void> => {
    const window = getCurrentWindow();
    await window.emit("dialog-opening");

    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        defaultPath: localRootDirectory,
      });

      if (selectedPath) {
        setLocalRootDirectory(selectedPath);
        await setRootDirectory(selectedPath);
        triggerDebouncedScan();
      }
    } finally {
      await window.emit("dialog-closed");
    }
  };

  const handleCategoryToggle = useCallback(
    async (category: DependencyCategory): Promise<void> => {
      await toggleCategory(category);
      triggerDebouncedScan();
    },
    [toggleCategory, triggerDebouncedScan]
  );

  const handlePermanentDeleteToggle = async (): Promise<void> => {
    await setPermanentDelete(!permanentDelete);
  };

  const handleConfirmBeforeDeleteToggle = async (): Promise<void> => {
    await setConfirmBeforeDelete(!confirmBeforeDelete);
  };

  const handleNotifyOnThresholdExceededToggle = async (): Promise<void> => {
    await setNotifyOnThresholdExceeded(!notifyOnThresholdExceeded);
  };

  const handleLaunchAtLoginToggle = async (): Promise<void> => {
    const newValue = !launchAtLogin;
    setLaunchAtLogin(newValue);
    await invoke("set_autostart_enabled", { enabled: newValue });
  };

  const handleRescanIntervalChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> => {
    await setRescanInterval(event.target.value as RescanInterval);
  };

  const handleSortOrderChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    setSortOrder(event.target.value as SortOrder);
  };

  const rescanIntervalOptions = useMemo(
    () =>
      ALL_RESCAN_INTERVALS.map((interval) => ({
        value: interval,
        label: RESCAN_INTERVAL_LABELS[interval],
      })),
    []
  );

  const sortOrderOptions = useMemo(
    () =>
      ALL_SORT_ORDERS.map((order) => ({
        value: order,
        label: SORT_ORDER_LABELS[order],
      })),
    []
  );

  const languageOptions = useMemo(
    () =>
      languages.map((language) => ({
        value: language.code,
        label: language.nativeName,
      })),
    []
  );

  const fontSizeOptions = useMemo(
    () =>
      ALL_FONT_SIZES.map((size) => ({
        value: size,
        label: FONT_SIZE_LABELS[size],
      })),
    []
  );

  const handleFontSizeChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> => {
    await setFontSize(event.target.value as FontSize);
  };

  const handleLanguageChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> => {
    await i18n.changeLanguage(event.target.value);
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 pt-2 pb-3">
      <FormField label={t("scan.scanFor")} hint={t("scan.folderTypes")}>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_DEPENDENCY_CATEGORIES.map((category) => {
            const isEnabled = enabledCategories.includes(category);
            const isOnlyEnabled = enabledCategories.length === 1 && isEnabled;

            return (
              <Checkbox
                key={category}
                checked={isEnabled}
                onChange={() => handleCategoryToggle(category)}
                label={DEPENDENCY_CATEGORY_LABELS[category]}
                color={CATEGORY_COLORS[category]}
                disabled={isOnlyEnabled}
              />
            );
          })}
        </div>
      </FormField>

      <FormField label={t("settings.deletion")} hint={t("settings.deletionDesc")}>
        <div className="flex flex-col gap-1.5">
          <Checkbox
            checked={permanentDelete}
            onChange={handlePermanentDeleteToggle}
            label={t("settings.permanentDelete")}
            color="danger"
          />
          <Checkbox
            checked={confirmBeforeDelete}
            onChange={handleConfirmBeforeDeleteToggle}
            label={t("settings.confirmBeforeDelete")}
            color="default"
          />
        </div>
      </FormField>

      <FormField
        label={t("settings.rootDirectory")}
        hint={t("settings.rootDirectoryDesc")}
        htmlFor="root-directory-input"
      >
        <Input
          id="root-directory-input"
          variant={InputVariant.TEXT}
          value={localRootDirectory}
          onChange={handleRootDirectoryChange}
          onBlur={handleRootDirectoryBlur}
          onKeyDown={handleRootDirectoryKeyDown}
          placeholder="/Users/username"
          inlineButton={
            <span className="shrink-0 mr-2">
              <Icon
                icon={FolderOpen}
                size={IconSize.MEDIUM}
                onClick={handleBrowseFolder}
                ariaLabel="Browse for folder"
                className="text-text-muted dark:text-text-muted-dark"
              />
            </span>
          }
        />
      </FormField>

      <FormField
        label={t("settings.threshold")}
        hint={t("settings.thresholdDesc")}
        htmlFor="threshold-input"
      >
        <Input
          id="threshold-input"
          variant={InputVariant.NUMBER}
          min={1}
          value={localThresholdGigabytes}
          onChange={handleThresholdChange}
          onBlur={handleThresholdBlur}
          onKeyDown={handleThresholdKeyDown}
          aria-label="Alert threshold in gigabytes"
          inlineSuffix="GB"
        />
        <div className="mt-1.5">
          <Checkbox
            checked={notifyOnThresholdExceeded}
            onChange={handleNotifyOnThresholdExceededToggle}
            label={t("settings.notifyOnThresholdExceeded")}
            color="default"
          />
        </div>
      </FormField>

      <FormField
        label={t("settings.minSize")}
        hint={t("settings.minSizeDesc")}
        htmlFor="min-size-input"
      >
        <Input
          id="min-size-input"
          variant={InputVariant.NUMBER}
          min={0}
          value={localMinSizeMegabytes}
          onChange={handleMinSizeChange}
          onBlur={handleMinSizeBlur}
          onKeyDown={handleMinSizeKeyDown}
          aria-label="Minimum folder size in megabytes"
          inlineSuffix="MB"
        />
      </FormField>

      <FormField
        label={t("settings.excludePaths")}
        hint={t("settings.excludePathsDesc")}
        htmlFor="exclude-paths-input"
      >
        <Input
          id="exclude-paths-input"
          variant={InputVariant.TEXT}
          value={localExcludePaths}
          onChange={handleExcludePathsChange}
          onBlur={handleExcludePathsBlur}
          onKeyDown={handleExcludePathsKeyDown}
          placeholder="*/active-*, */keep/*"
          aria-label="Comma-separated wildcard patterns to exclude"
        />
      </FormField>

      <FormField
        label={t("settings.sortBy")}
        hint={t("settings.sortByDesc")}
        htmlFor="sort-order-select"
      >
        <Select
          id="sort-order-select"
          value={sortOrder}
          onChange={handleSortOrderChange}
          options={sortOrderOptions}
          aria-label="Sort order"
        />
      </FormField>

      <FormField
        label={t("settings.rescanInterval")}
        hint={t("settings.rescanIntervalDesc")}
        htmlFor="rescan-interval-select"
      >
        <Select
          id="rescan-interval-select"
          value={rescanInterval}
          onChange={handleRescanIntervalChange}
          options={rescanIntervalOptions}
          aria-label="Auto-rescan interval"
        />
      </FormField>

      <FormField
        label={t("settings.language")}
        hint={t("settings.languageDesc")}
        htmlFor="language-select"
      >
        <Select
          id="language-select"
          value={i18n.language}
          onChange={handleLanguageChange}
          options={languageOptions}
          aria-label="Application language"
        />
      </FormField>

      <FormField
        label={t("settings.fontSize")}
        hint={t("settings.fontSizeDesc")}
        htmlFor="font-size-select"
      >
        <Select
          id="font-size-select"
          value={fontSize}
          onChange={handleFontSizeChange}
          options={fontSizeOptions}
          aria-label="Font size"
        />
      </FormField>

      <FormField
        label={t("settings.startup")}
        hint={t("settings.startupDesc")}
        last={true}
      >
        <Checkbox
          checked={launchAtLogin}
          onChange={handleLaunchAtLoginToggle}
          label={t("settings.launchAtLogin")}
          color="default"
        />
      </FormField>
    </div>
  );
}
