import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type {
  DirectoryEntry,
  ScanResult,
  AppSettings,
  DeleteResult,
  RescanResult,
} from "../types/interfaces";
import { ScanStatus } from "../types/scanStatus";
import { SortOrder } from "../types/sortOrder";
import { DependencyCategory, ALL_DEPENDENCY_CATEGORIES } from "../types/dependencyCategory";
import { FontSize } from "../types/fontSize";
import { RescanInterval, RESCAN_INTERVAL_MS } from "../types/rescanInterval";
import { storeLogger } from "../utilities/logger";
import { containsDependencyDirectory } from "../utilities/pathParser";
import { notifyThresholdExceeded } from "../utilities/notifications";
import { toggleSetItem, removeFromSet } from "../utilities/setUtils";
import sumBy from "lodash-es/sumBy";
import debounce from "lodash-es/debounce";

interface DependencyState {
  directories: DirectoryEntry[];
  totalSize: number;
  scanStatus: ScanStatus;
  skippedCount: number;
  scannedCount: number;
  thresholdBytes: number;
  rootDirectory: string;
  enabledCategories: DependencyCategory[];
  minSizeBytes: number;
  permanentDelete: boolean;
  excludePaths: string;
  rescanInterval: RescanInterval;
  confirmBeforeDelete: boolean;
  notifyOnThresholdExceeded: boolean;
  fontSize: FontSize;
  sortOrder: SortOrder;
  error: string | null;
  currentScanPath: string | null;
  recentlyCheckedPaths: string[];
  scanDirectories: DirectoryEntry[];
  scanTotalSize: number;
  lastScanTimestamp: number | null;
  selectedPaths: Set<string>;
  deletingPaths: Set<string>;
}

interface DependencyActions {
  startScan: () => Promise<void>;
  cancelScan: () => Promise<void>;
  addDirectory: (entry: DirectoryEntry) => void;
  updateScanStats: (options: { totalSize: number; currentPath: string | null }) => void;
  setScanComplete: (result: ScanResult) => void;
  setScanCancelled: () => void;
  setScanError: (error: string) => void;
  deleteDirectory: (path: string) => Promise<DeleteResult | null>;
  deleteSelectedDirectories: () => Promise<void>;
  rescanDirectory: (path: string) => Promise<RescanResult | null>;
  setThreshold: (bytes: number) => Promise<void>;
  setRootDirectory: (path: string) => Promise<void>;
  setEnabledCategories: (categories: DependencyCategory[]) => Promise<void>;
  toggleCategory: (category: DependencyCategory) => Promise<void>;
  setMinSize: (bytes: number) => Promise<void>;
  setPermanentDelete: (enabled: boolean) => Promise<void>;
  setExcludePaths: (paths: string) => Promise<void>;
  setRescanInterval: (interval: RescanInterval) => Promise<void>;
  setConfirmBeforeDelete: (enabled: boolean) => Promise<void>;
  setNotifyOnThresholdExceeded: (enabled: boolean) => Promise<void>;
  setFontSize: (fontSize: FontSize) => Promise<void>;
  loadSettings: () => Promise<void>;
  setSortOrder: (order: SortOrder) => void;
  updateTrayIcon: () => Promise<void>;
  shouldRescan: () => boolean;
  reset: () => void;
  toggleSelection: (path: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
}

type DependencyStore = DependencyState & DependencyActions;

// Module-level singleton avoids race conditions; getter ensures fresh state
const trayUpdateManager = {
  debouncedUpdate: null as ReturnType<typeof debounce<() => void>> | null,
  storeGetter: null as (() => DependencyStore) | null,

  initialize(getStore: () => DependencyStore): void {
    this.storeGetter = getStore;
    this.debouncedUpdate = debounce(() => {
      if (this.storeGetter) {
        this.storeGetter().updateTrayIcon();
      }
    }, 500);
  },

  schedule(): void {
    if (this.debouncedUpdate) {
      this.debouncedUpdate();
    }
  },

  cancel(): void {
    if (this.debouncedUpdate) {
      this.debouncedUpdate.cancel();
    }
  },
};

const DEFAULT_THRESHOLD_BYTES = 10_737_418_240;
const DEFAULT_ROOT_DIRECTORY = "~";
const DEFAULT_MIN_SIZE_BYTES = 0;
const DEFAULT_PERMANENT_DELETE = false;
const DEFAULT_EXCLUDE_PATHS = "";
const DEFAULT_RESCAN_INTERVAL = RescanInterval.ONE_DAY;
const DEFAULT_CONFIRM_BEFORE_DELETE = true;
const DEFAULT_NOTIFY_ON_THRESHOLD_EXCEEDED = true;
const DEFAULT_FONT_SIZE = FontSize.DEFAULT;

const initialState: DependencyState = {
  directories: [],
  totalSize: 0,
  scanStatus: ScanStatus.IDLE,
  skippedCount: 0,
  scannedCount: 0,
  thresholdBytes: DEFAULT_THRESHOLD_BYTES,
  rootDirectory: DEFAULT_ROOT_DIRECTORY,
  enabledCategories: [...ALL_DEPENDENCY_CATEGORIES],
  minSizeBytes: DEFAULT_MIN_SIZE_BYTES,
  permanentDelete: DEFAULT_PERMANENT_DELETE,
  excludePaths: DEFAULT_EXCLUDE_PATHS,
  rescanInterval: DEFAULT_RESCAN_INTERVAL,
  confirmBeforeDelete: DEFAULT_CONFIRM_BEFORE_DELETE,
  notifyOnThresholdExceeded: DEFAULT_NOTIFY_ON_THRESHOLD_EXCEEDED,
  fontSize: DEFAULT_FONT_SIZE,
  sortOrder: SortOrder.SIZE_DESC,
  error: null,
  currentScanPath: null,
  recentlyCheckedPaths: [],
  scanDirectories: [],
  scanTotalSize: 0,
  lastScanTimestamp: null,
  selectedPaths: new Set(),
  deletingPaths: new Set(),
};

const MAX_RECENTLY_CHECKED = 5;

function calculateTotalSize(directories: DirectoryEntry[]): number {
  return sumBy(directories, "sizeBytes");
}

interface SettingsFields {
  thresholdBytes: number;
  rootDirectory: string;
  enabledCategories: DependencyCategory[];
  minSizeBytes: number;
  permanentDelete: boolean;
  excludePaths: string;
  rescanInterval: RescanInterval;
  confirmBeforeDelete: boolean;
  notifyOnThresholdExceeded: boolean;
  fontSize: FontSize;
}

function buildSettingsObject(state: DependencyState, overrides: Partial<SettingsFields> = {}): SettingsFields {
  return {
    thresholdBytes: state.thresholdBytes,
    rootDirectory: state.rootDirectory,
    enabledCategories: state.enabledCategories,
    minSizeBytes: state.minSizeBytes,
    permanentDelete: state.permanentDelete,
    excludePaths: state.excludePaths,
    rescanInterval: state.rescanInterval,
    confirmBeforeDelete: state.confirmBeforeDelete,
    notifyOnThresholdExceeded: state.notifyOnThresholdExceeded,
    fontSize: state.fontSize,
    ...overrides,
  };
}

export const useDependencyStore = create<DependencyStore>()(
  persist(
    (set, get) => ({
  ...initialState,

  startScan: async (): Promise<void> => {
    storeLogger.log("startScan called");
    const startTime = performance.now();

    trayUpdateManager.cancel();

    set({
      scanStatus: ScanStatus.SCANNING,
      skippedCount: 0,
      scannedCount: 0,
      error: null,
      currentScanPath: null,
      recentlyCheckedPaths: [],
      scanDirectories: [],
      scanTotalSize: 0,
      directories: [],
      totalSize: 0,
    });

    await get().updateTrayIcon();

    try {
      await invoke("start_scan");
      storeLogger.log(`start_scan invoked in ${(performance.now() - startTime).toFixed(2)}ms`);
    } catch (error) {
      storeLogger.error("start_scan error:", error);
      set({
        scanStatus: ScanStatus.ERROR,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  cancelScan: async (): Promise<void> => {
    storeLogger.log("cancelScan called");
    try {
      await invoke("cancel_scan");
      set({ scanStatus: ScanStatus.IDLE, currentScanPath: null });
      storeLogger.log("Scan cancelled");
    } catch (error) {
      storeLogger.error("Failed to cancel scan:", error);
    }
  },

  addDirectory: (entry: DirectoryEntry): void => {
    storeLogger.debug(`addDirectory: ${entry.path} (${(entry.sizeBytes / 1024 / 1024).toFixed(1)} MB)`);
    set((state) => {
      const alreadyExists = state.scanDirectories.some(
        (directory) => directory.path === entry.path
      );
      if (alreadyExists) {
        storeLogger.debug(`Skipping duplicate: ${entry.path}`);
        return state;
      }

      if (entry.sizeBytes < state.minSizeBytes) {
        storeLogger.debug(`Skipping ${entry.path} - below minimum size (${entry.sizeBytes} < ${state.minSizeBytes})`);
        return state;
      }

      const newScanDirectories = [...state.scanDirectories, entry];
      const newScanTotalSize = state.scanTotalSize + entry.sizeBytes;
      return {
        scanDirectories: newScanDirectories,
        scanTotalSize: newScanTotalSize,
        directories: newScanDirectories,
        totalSize: newScanTotalSize,
      };
    });

    trayUpdateManager.schedule();
  },

  updateScanStats: (options: { totalSize: number; currentPath: string | null }): void => {
    set((state) => {
      let newRecentlyChecked = state.recentlyCheckedPaths;

      if (options.currentPath && !containsDependencyDirectory(options.currentPath)) {
        newRecentlyChecked = [
          options.currentPath,
          ...state.recentlyCheckedPaths.filter((path) => path !== options.currentPath),
        ].slice(0, MAX_RECENTLY_CHECKED);
      }

      return {
        currentScanPath: options.currentPath,
        recentlyCheckedPaths: newRecentlyChecked,
        scannedCount: state.scannedCount + 1,
      };
    });
  },

  setScanComplete: (result: ScanResult): void => {
    storeLogger.log(`setScanComplete: ${result.entries.length} entries, ${(result.totalSize / 1024 / 1024 / 1024).toFixed(2)} GB total, ${result.scanTimeMs}ms`);
    const state = get();
    set({
      directories: result.entries,
      totalSize: result.totalSize,
      skippedCount: result.skippedCount,
      scanStatus: ScanStatus.COMPLETED,
      currentScanPath: null,
      recentlyCheckedPaths: [],
      lastScanTimestamp: Date.now(),
    });
    get().updateTrayIcon();

    if (result.totalSize > state.thresholdBytes && state.notifyOnThresholdExceeded) {
      notifyThresholdExceeded({
        totalSize: result.totalSize,
        thresholdBytes: state.thresholdBytes,
      });
    }
  },

  setScanCancelled: (): void => {
    storeLogger.log("setScanCancelled");
    set({
      scanStatus: ScanStatus.IDLE,
      currentScanPath: null,
      recentlyCheckedPaths: [],
    });
  },

  setScanError: (error: string): void => {
    storeLogger.error("setScanError:", error);
    set({
      scanStatus: ScanStatus.ERROR,
      error,
    });
  },

  deleteDirectory: async (path: string): Promise<DeleteResult | null> => {
    storeLogger.log(`deleteDirectory: ${path}`);
    const startTime = performance.now();
    const state = get();
    const entry = state.directories.find((directory) => directory.path === path);

    if (!entry) {
      storeLogger.warn(`deleteDirectory: entry not found for ${path}`);
      return null;
    }

    try {
      const result = await invoke<DeleteResult>("delete_to_trash", { path });
      storeLogger.log(`deleteDirectory completed in ${(performance.now() - startTime).toFixed(2)}ms, success: ${result.success}`);

      if (result.success) {
        set((state) => {
          const newDirectories = state.directories.filter(
            (directory) => directory.path !== path
          );
          const newTotalSize = calculateTotalSize(newDirectories);
          storeLogger.log(`deleteDirectory: updating totalSize from ${state.totalSize} to ${newTotalSize}`);

          return {
            directories: newDirectories,
            totalSize: newTotalSize,
            selectedPaths: removeFromSet(state.selectedPaths, path),
          };
        });
        get().updateTrayIcon();
      }

      return result;
    } catch (error) {
      storeLogger.error("Failed to delete directory:", error);
      return {
        success: false,
        path,
        sizeFreed: 0,
      };
    }
  },

  rescanDirectory: async (path: string): Promise<RescanResult | null> => {
    storeLogger.log(`rescanDirectory: ${path}`);
    const startTime = performance.now();

    try {
      const result = await invoke<RescanResult>("rescan_directory", { path });
      storeLogger.log(`rescanDirectory completed in ${(performance.now() - startTime).toFixed(2)}ms, exists: ${result.exists}`);

      /* v8 ignore start -- v8 quirk with if/else if branch coverage */
      if (!result.exists) {
        set((state) => {
          const newDirectories = state.directories.filter(
            (directory) => directory.path !== path
          );

          return {
            directories: newDirectories,
            totalSize: calculateTotalSize(newDirectories),
            selectedPaths: removeFromSet(state.selectedPaths, path),
          };
        });
        get().updateTrayIcon();
      } else if (result.entry) {
        set((state) => {
          const newDirectories = state.directories.map((directory) =>
            directory.path === path ? result.entry! : directory
          );
          return {
            directories: newDirectories,
            totalSize: calculateTotalSize(newDirectories),
          };
        });
        get().updateTrayIcon();
      }
      /* v8 ignore stop */

      return result;
    } catch (error) {
      storeLogger.error("Failed to rescan directory:", error);
      return null;
    }
  },

  setThreshold: async (bytes: number): Promise<void> => {
    storeLogger.log(`setThreshold: ${bytes} bytes`);
    set({ thresholdBytes: bytes });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { thresholdBytes: bytes }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }

    await get().updateTrayIcon();
  },

  setRootDirectory: async (path: string): Promise<void> => {
    storeLogger.log(`setRootDirectory: ${path}`);
    set({ rootDirectory: path });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { rootDirectory: path }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }
  },

  setEnabledCategories: async (categories: DependencyCategory[]): Promise<void> => {
    storeLogger.log(`setEnabledCategories: ${categories.join(", ")}`);
    set({ enabledCategories: categories });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { enabledCategories: categories }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }
  },

  setMinSize: async (bytes: number): Promise<void> => {
    storeLogger.log(`setMinSize: ${bytes} bytes`);
    set({ minSizeBytes: bytes });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { minSizeBytes: bytes }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }
  },

  setPermanentDelete: async (enabled: boolean): Promise<void> => {
    storeLogger.log(`setPermanentDelete: ${enabled}`);
    set({ permanentDelete: enabled });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { permanentDelete: enabled }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }
  },

  setExcludePaths: async (paths: string): Promise<void> => {
    storeLogger.log(`setExcludePaths: ${paths}`);
    set({ excludePaths: paths });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { excludePaths: paths }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }
  },

  setRescanInterval: async (interval: RescanInterval): Promise<void> => {
    storeLogger.log(`setRescanInterval: ${interval}`);
    set({ rescanInterval: interval });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { rescanInterval: interval }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }
  },

  setConfirmBeforeDelete: async (enabled: boolean): Promise<void> => {
    storeLogger.log(`setConfirmBeforeDelete: ${enabled}`);
    set({ confirmBeforeDelete: enabled });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { confirmBeforeDelete: enabled }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }
  },

  setNotifyOnThresholdExceeded: async (enabled: boolean): Promise<void> => {
    storeLogger.log(`setNotifyOnThresholdExceeded: ${enabled}`);
    set({ notifyOnThresholdExceeded: enabled });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { notifyOnThresholdExceeded: enabled }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }
  },

  setFontSize: async (fontSize: FontSize): Promise<void> => {
    storeLogger.log(`setFontSize: ${fontSize}`);
    set({ fontSize });

    try {
      await invoke("save_settings", {
        settings: buildSettingsObject(get(), { fontSize }),
      });
    } catch (error) {
      storeLogger.error("Failed to save settings:", error);
    }
  },

  toggleCategory: async (category: DependencyCategory): Promise<void> => {
    const state = get();
    const isEnabled = state.enabledCategories.includes(category);
    const newCategories = isEnabled
      ? state.enabledCategories.filter((existingCategory) => existingCategory !== category)
      : [...state.enabledCategories, category];

    if (newCategories.length === 0) {
      storeLogger.warn("Cannot disable all categories");
      return;
    }

    await get().setEnabledCategories(newCategories);
  },

  loadSettings: async (): Promise<void> => {
    storeLogger.log("loadSettings called");
    const startTime = performance.now();
    try {
      const settings = await invoke<AppSettings>("get_settings");
      storeLogger.log(
        `loadSettings completed in ${(performance.now() - startTime).toFixed(2)}ms, ` +
        `threshold: ${settings.thresholdBytes}, rootDirectory: ${settings.rootDirectory}, ` +
        `categories: ${settings.enabledCategories.join(", ")}, minSize: ${settings.minSizeBytes}, ` +
        `permanentDelete: ${settings.permanentDelete}, excludePaths: ${settings.excludePaths}, ` +
        `rescanInterval: ${settings.rescanInterval}, confirmBeforeDelete: ${settings.confirmBeforeDelete}, ` +
        `notifyOnThresholdExceeded: ${settings.notifyOnThresholdExceeded}`
      );
      set({
        thresholdBytes: settings.thresholdBytes,
        rootDirectory: settings.rootDirectory,
        enabledCategories: settings.enabledCategories,
        minSizeBytes: settings.minSizeBytes,
        permanentDelete: settings.permanentDelete,
        excludePaths: settings.excludePaths,
        rescanInterval: settings.rescanInterval,
        confirmBeforeDelete: settings.confirmBeforeDelete,
        notifyOnThresholdExceeded: settings.notifyOnThresholdExceeded,
        fontSize: settings.fontSize,
      });
    } catch (error) {
      storeLogger.error("Failed to load settings:", error);
    }
  },

  setSortOrder: (order: SortOrder): void => {
    storeLogger.log(`setSortOrder: ${order}`);
    set({ sortOrder: order });
  },

  updateTrayIcon: async (): Promise<void> => {
    const state = get();

    try {
      await invoke("set_tray_icon", {
        totalSize: state.totalSize,
        threshold: state.thresholdBytes,
      });
    } catch (error) {
      storeLogger.error("Failed to update tray icon:", error);
    }
  },

  shouldRescan: (): boolean => {
    const state = get();
    const intervalMs = RESCAN_INTERVAL_MS[state.rescanInterval];

    if (intervalMs === null) {
      storeLogger.log("shouldRescan: false (auto-rescan disabled)");
      return false;
    }

    if (state.lastScanTimestamp === null) {
      storeLogger.log("shouldRescan: true (no previous scan)");
      return true;
    }

    const timeSinceLastScan = Date.now() - state.lastScanTimestamp;
    const shouldRescan = timeSinceLastScan > intervalMs;
    storeLogger.log(`shouldRescan: ${shouldRescan} (${Math.round(timeSinceLastScan / 1000 / 60)} minutes since last scan, interval: ${state.rescanInterval})`);
    return shouldRescan;
  },

  reset: (): void => {
    set(initialState);
  },

  toggleSelection: (path: string): void => {
    set((state) => ({
      selectedPaths: toggleSetItem(state.selectedPaths, path),
    }));
  },

  clearSelection: (): void => {
    set({ selectedPaths: new Set() });
  },

  selectAll: (): void => {
    set((state) => ({
      selectedPaths: new Set(state.directories.map((directory) => directory.path)),
    }));
  },

  deleteSelectedDirectories: async (): Promise<void> => {
    const state = get();
    const pathsToDelete = Array.from(state.selectedPaths);

    if (pathsToDelete.length === 0) {
      return;
    }

    storeLogger.log(`deleteSelectedDirectories: ${pathsToDelete.length} directories`);
    const startTime = performance.now();

    set({ deletingPaths: new Set(pathsToDelete) });

    const deletePromises = pathsToDelete.map(async (path) => {
      try {
        const result = await invoke<DeleteResult>("delete_to_trash", { path });
        return { path, result };
      } catch (error) {
        storeLogger.error(`Failed to delete ${path}:`, error);
        return {
          path,
          result: { success: false, path, sizeFreed: 0 } as DeleteResult,
        };
      }
    });

    const results = await Promise.all(deletePromises);
    const successfulPaths = results
      .filter(({ result }) => result.success)
      .map(({ path }) => path);

    set((state) => {
      if (successfulPaths.length === 0) {
        return {
          selectedPaths: new Set(),
          deletingPaths: new Set(),
        };
      }

      const newDirectories = state.directories.filter(
        (directory) => !successfulPaths.includes(directory.path)
      );

      return {
        directories: newDirectories,
        totalSize: calculateTotalSize(newDirectories),
        selectedPaths: new Set(),
        deletingPaths: new Set(),
      };
    });

    if (successfulPaths.length > 0) {
      get().updateTrayIcon();
    }

    storeLogger.log(
      `deleteSelectedDirectories completed in ${(performance.now() - startTime).toFixed(2)}ms, ` +
      `${successfulPaths.length}/${pathsToDelete.length} successful`
    );
  },
    }),
    {
      name: "deptox-settings",
      version: 9,
      partialize: (state) => ({
        thresholdBytes: state.thresholdBytes,
        rootDirectory: state.rootDirectory,
        enabledCategories: state.enabledCategories,
        minSizeBytes: state.minSizeBytes,
        permanentDelete: state.permanentDelete,
        excludePaths: state.excludePaths,
        rescanInterval: state.rescanInterval,
        confirmBeforeDelete: state.confirmBeforeDelete,
        notifyOnThresholdExceeded: state.notifyOnThresholdExceeded,
        fontSize: state.fontSize,
        sortOrder: state.sortOrder,
        lastScanTimestamp: state.lastScanTimestamp,
      }),
    }
  )
);

trayUpdateManager.initialize(() => useDependencyStore.getState());
