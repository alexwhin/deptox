import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useDependencyStore } from "./dependencyStore";
import { ScanStatus } from "../types/scanStatus";
import { SortOrder } from "../types/sortOrder";
import { DependencyCategory, ALL_DEPENDENCY_CATEGORIES } from "../types/dependencyCategory";
import { FontSize } from "../types/fontSize";
import { RescanInterval, RESCAN_INTERVAL_MS } from "../types/rescanInterval";
import type { ScanResult, DeleteResult, RescanResult, AppSettings } from "../types/interfaces";
import {
  setupFakeTimers,
  teardownFakeTimers,
  createMockDirectoryEntry,
} from "../test-helpers";
import { notifyThresholdExceeded } from "../utilities/notifications";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);
const mockNotifyThresholdExceeded = vi.mocked(notifyThresholdExceeded);

vi.mock("../utilities/logger", () => ({
  storeLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../utilities/notifications", () => ({
  notifyThresholdExceeded: vi.fn(),
}));

describe("dependencyStore", () => {
  beforeEach(() => {
    setupFakeTimers();
    mockInvoke.mockClear();

    const { reset } = useDependencyStore.getState();
    act(() => {
      reset();
    });
  });

  afterEach(() => {
    teardownFakeTimers();
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("has correct default values", () => {
      const state = useDependencyStore.getState();

      expect(state.directories).toEqual([]);
      expect(state.totalSize).toBe(0);
      expect(state.scanStatus).toBe(ScanStatus.IDLE);
      expect(state.skippedCount).toBe(0);
      expect(state.scannedCount).toBe(0);
      expect(state.thresholdBytes).toBe(10_737_418_240);
      expect(state.rootDirectory).toBe("~");
      expect(state.enabledCategories).toHaveLength(8);
      expect(state.minSizeBytes).toBe(0);
      expect(state.permanentDelete).toBe(false);
      expect(state.excludePaths).toBe("");
      expect(state.rescanInterval).toBe(RescanInterval.ONE_DAY);
      expect(state.confirmBeforeDelete).toBe(true);
      expect(state.notifyOnThresholdExceeded).toBe(true);
      expect(state.fontSize).toBe(FontSize.DEFAULT);
      expect(state.sortOrder).toBe(SortOrder.SIZE_DESC);
      expect(state.error).toBeNull();
      expect(state.currentScanPath).toBeNull();
      expect(state.recentlyCheckedPaths).toEqual([]);
      expect(state.lastScanTimestamp).toBeNull();
      expect(state.selectedPaths).toEqual(new Set());
    });
  });

  describe("addDirectory", () => {
    it("adds a new directory entry", () => {
      const entry = createMockDirectoryEntry();

      act(() => {
        useDependencyStore.getState().addDirectory(entry);
      });

      const state = useDependencyStore.getState();
      expect(state.scanDirectories).toHaveLength(1);
      expect(state.scanDirectories[0]).toEqual(entry);
      expect(state.scanTotalSize).toBe(entry.sizeBytes);
    });

    it("does not add entries below minimum size", () => {
      const entry = createMockDirectoryEntry({ sizeBytes: 500 });

      act(() => {
        useDependencyStore.setState({ minSizeBytes: 1000 });
        useDependencyStore.getState().addDirectory(entry);
      });

      const state = useDependencyStore.getState();
      expect(state.scanDirectories).toHaveLength(0);
      expect(state.scanTotalSize).toBe(0);
    });

    it("does not add duplicate entries", () => {
      const entry = createMockDirectoryEntry();

      act(() => {
        useDependencyStore.getState().addDirectory(entry);
        useDependencyStore.getState().addDirectory(entry);
      });

      const state = useDependencyStore.getState();
      expect(state.scanDirectories).toHaveLength(1);
    });

    it("accumulates total size correctly", () => {
      const entry1 = createMockDirectoryEntry({ path: "/project1/node_modules", sizeBytes: 1000 });
      const entry2 = createMockDirectoryEntry({ path: "/project2/node_modules", sizeBytes: 2000 });

      act(() => {
        useDependencyStore.getState().addDirectory(entry1);
        useDependencyStore.getState().addDirectory(entry2);
      });

      const state = useDependencyStore.getState();
      expect(state.scanTotalSize).toBe(3000);
    });
  });

  describe("updateScanStats", () => {
    it("updates current scan path", () => {
      act(() => {
        useDependencyStore.getState().updateScanStats({
          totalSize: 1000,
          currentPath: "/some/path",
        });
      });

      const state = useDependencyStore.getState();
      expect(state.currentScanPath).toBe("/some/path");
    });

    it("increments scanned count", () => {
      act(() => {
        useDependencyStore.getState().updateScanStats({
          totalSize: 1000,
          currentPath: "/path1",
        });
        useDependencyStore.getState().updateScanStats({
          totalSize: 2000,
          currentPath: "/path2",
        });
      });

      const state = useDependencyStore.getState();
      expect(state.scannedCount).toBe(2);
    });

    it("adds non-dependency paths to recently checked", () => {
      act(() => {
        useDependencyStore.getState().updateScanStats({
          totalSize: 1000,
          currentPath: "/some/regular/path",
        });
      });

      const state = useDependencyStore.getState();
      expect(state.recentlyCheckedPaths).toContain("/some/regular/path");
    });

    it("does not add dependency directory paths to recently checked", () => {
      act(() => {
        useDependencyStore.getState().updateScanStats({
          totalSize: 1000,
          currentPath: "/project/node_modules/lodash",
        });
      });

      const state = useDependencyStore.getState();
      expect(state.recentlyCheckedPaths).not.toContain("/project/node_modules/lodash");
    });

    it("limits recently checked paths to 5", () => {
      act(() => {
        for (let index = 0; index < 10; index++) {
          useDependencyStore.getState().updateScanStats({
            totalSize: 1000,
            currentPath: `/path${index}`,
          });
        }
      });

      const state = useDependencyStore.getState();
      expect(state.recentlyCheckedPaths).toHaveLength(5);
    });

    it("puts most recent path first", () => {
      act(() => {
        useDependencyStore.getState().updateScanStats({
          totalSize: 1000,
          currentPath: "/first",
        });
        useDependencyStore.getState().updateScanStats({
          totalSize: 1000,
          currentPath: "/second",
        });
      });

      const state = useDependencyStore.getState();
      expect(state.recentlyCheckedPaths[0]).toBe("/second");
      expect(state.recentlyCheckedPaths[1]).toBe("/first");
    });
  });

  describe("setScanComplete", () => {
    it("updates state with scan results", () => {
      const entries = [
        createMockDirectoryEntry({ path: "/p1/node_modules", sizeBytes: 1000 }),
        createMockDirectoryEntry({ path: "/p2/node_modules", sizeBytes: 2000 }),
      ];

      const result: ScanResult = {
        entries,
        totalSize: 3000,
        skippedCount: 5,
        scanTimeMs: 100,
      };

      act(() => {
        useDependencyStore.getState().setScanComplete(result);
      });

      const state = useDependencyStore.getState();
      expect(state.directories).toEqual(entries);
      expect(state.totalSize).toBe(3000);
      expect(state.skippedCount).toBe(5);
      expect(state.scanStatus).toBe(ScanStatus.COMPLETED);
      expect(state.currentScanPath).toBeNull();
      expect(state.recentlyCheckedPaths).toEqual([]);
    });

    it("sets lastScanTimestamp to current time", () => {
      const result: ScanResult = {
        entries: [],
        totalSize: 0,
        skippedCount: 0,
        scanTimeMs: 50,
      };

      act(() => {
        useDependencyStore.getState().setScanComplete(result);
      });

      const state = useDependencyStore.getState();
      expect(state.lastScanTimestamp).toBe(Date.now());
    });

    it("sends notification when threshold exceeded and notifications enabled", () => {
      act(() => {
        useDependencyStore.setState({
          thresholdBytes: 1000,
          notifyOnThresholdExceeded: true,
        });
      });

      const result: ScanResult = {
        entries: [],
        totalSize: 2000,
        skippedCount: 0,
        scanTimeMs: 50,
      };

      act(() => {
        useDependencyStore.getState().setScanComplete(result);
      });

      expect(mockNotifyThresholdExceeded).toHaveBeenCalledWith({
        totalSize: 2000,
        thresholdBytes: 1000,
      });
    });

    it("does not send notification when threshold not exceeded", () => {
      act(() => {
        useDependencyStore.setState({
          thresholdBytes: 1000,
          notifyOnThresholdExceeded: true,
        });
      });

      const result: ScanResult = {
        entries: [],
        totalSize: 500,
        skippedCount: 0,
        scanTimeMs: 50,
      };

      act(() => {
        useDependencyStore.getState().setScanComplete(result);
      });

      expect(mockNotifyThresholdExceeded).not.toHaveBeenCalled();
    });

    it("does not send notification when notifications disabled", () => {
      act(() => {
        useDependencyStore.setState({
          thresholdBytes: 1000,
          notifyOnThresholdExceeded: false,
        });
      });

      const result: ScanResult = {
        entries: [],
        totalSize: 2000,
        skippedCount: 0,
        scanTimeMs: 50,
      };

      act(() => {
        useDependencyStore.getState().setScanComplete(result);
      });

      expect(mockNotifyThresholdExceeded).not.toHaveBeenCalled();
    });
  });

  describe("setScanCancelled", () => {
    it("resets scan state to idle", () => {
      act(() => {
        useDependencyStore.setState({
          scanStatus: ScanStatus.SCANNING,
          currentScanPath: "/scanning",
          recentlyCheckedPaths: ["/path1", "/path2"],
        });
      });

      act(() => {
        useDependencyStore.getState().setScanCancelled();
      });

      const state = useDependencyStore.getState();
      expect(state.scanStatus).toBe(ScanStatus.IDLE);
      expect(state.currentScanPath).toBeNull();
      expect(state.recentlyCheckedPaths).toEqual([]);
    });
  });

  describe("setScanError", () => {
    it("sets error state", () => {
      act(() => {
        useDependencyStore.getState().setScanError("Test error message");
      });

      const state = useDependencyStore.getState();
      expect(state.scanStatus).toBe(ScanStatus.ERROR);
      expect(state.error).toBe("Test error message");
    });
  });

  describe("setSortOrder", () => {
    it("updates sort order", () => {
      act(() => {
        useDependencyStore.getState().setSortOrder(SortOrder.NAME_ASC);
      });

      const state = useDependencyStore.getState();
      expect(state.sortOrder).toBe(SortOrder.NAME_ASC);
    });
  });

  describe("shouldRescan", () => {
    it("returns true when no previous scan", () => {
      const result = useDependencyStore.getState().shouldRescan();
      expect(result).toBe(true);
    });

    it("returns false when rescan interval is NEVER", () => {
      act(() => {
        useDependencyStore.setState({
          rescanInterval: RescanInterval.NEVER,
          lastScanTimestamp: Date.now() - 1000,
        });
      });

      const result = useDependencyStore.getState().shouldRescan();
      expect(result).toBe(false);
    });

    it("returns true when interval has elapsed", () => {
      const oneDayAgo = Date.now() - (25 * 60 * 60 * 1000);

      act(() => {
        useDependencyStore.setState({
          rescanInterval: RescanInterval.ONE_DAY,
          lastScanTimestamp: oneDayAgo,
        });
      });

      const result = useDependencyStore.getState().shouldRescan();
      expect(result).toBe(true);
    });

    it("returns false when interval has not elapsed", () => {
      const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);

      act(() => {
        useDependencyStore.setState({
          rescanInterval: RescanInterval.ONE_DAY,
          lastScanTimestamp: twelveHoursAgo,
        });
      });

      const result = useDependencyStore.getState().shouldRescan();
      expect(result).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets state to initial values", () => {
      act(() => {
        useDependencyStore.setState({
          directories: [createMockDirectoryEntry()],
          totalSize: 5000,
          scanStatus: ScanStatus.ERROR,
          error: "Some error",
          sortOrder: SortOrder.NAME_DESC,
        });
      });

      act(() => {
        useDependencyStore.getState().reset();
      });

      const state = useDependencyStore.getState();
      expect(state.directories).toEqual([]);
      expect(state.totalSize).toBe(0);
      expect(state.scanStatus).toBe(ScanStatus.IDLE);
      expect(state.error).toBeNull();
      expect(state.sortOrder).toBe(SortOrder.SIZE_DESC);
    });
  });

  describe("RESCAN_INTERVAL_MS", () => {
    it("has correct millisecond values", () => {
      expect(RESCAN_INTERVAL_MS[RescanInterval.ONE_HOUR]).toBe(60 * 60 * 1000);
      expect(RESCAN_INTERVAL_MS[RescanInterval.ONE_DAY]).toBe(24 * 60 * 60 * 1000);
      expect(RESCAN_INTERVAL_MS[RescanInterval.ONE_WEEK]).toBe(7 * 24 * 60 * 60 * 1000);
      expect(RESCAN_INTERVAL_MS[RescanInterval.ONE_MONTH]).toBe(30 * 24 * 60 * 60 * 1000);
      expect(RESCAN_INTERVAL_MS[RescanInterval.NEVER]).toBeNull();
    });
  });

  describe("startScan", () => {
    it("sets scanning state and invokes start_scan command", async () => {
      // First call is for updateTrayIcon (set_tray_icon), second is for start_scan
      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().startScan();
      });

      expect(mockInvoke).toHaveBeenCalledWith("set_tray_icon", expect.any(Object));
      expect(mockInvoke).toHaveBeenCalledWith("start_scan");
      const state = useDependencyStore.getState();
      expect(state.scanStatus).toBe(ScanStatus.SCANNING);
      expect(state.skippedCount).toBe(0);
      expect(state.scannedCount).toBe(0);
      expect(state.error).toBeNull();
      expect(state.currentScanPath).toBeNull();
      expect(state.recentlyCheckedPaths).toEqual([]);
      expect(state.scanDirectories).toEqual([]);
      expect(state.scanTotalSize).toBe(0);
    });

    it("sets error state when start_scan fails", async () => {
      // First call is for updateTrayIcon (set_tray_icon), second is for start_scan
      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockRejectedValueOnce(new Error("Scan failed"));

      await act(async () => {
        await useDependencyStore.getState().startScan();
      });

      const state = useDependencyStore.getState();
      expect(state.scanStatus).toBe(ScanStatus.ERROR);
      expect(state.error).toBe("Scan failed");
    });

    it("handles non-Error rejections", async () => {
      // First call is for updateTrayIcon (set_tray_icon), second is for start_scan
      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockRejectedValueOnce("String error");

      await act(async () => {
        await useDependencyStore.getState().startScan();
      });

      const state = useDependencyStore.getState();
      expect(state.scanStatus).toBe(ScanStatus.ERROR);
      expect(state.error).toBe("String error");
    });

    it("resets totalSize to zero and clears tray when starting new scan", async () => {
      act(() => {
        useDependencyStore.setState({
          totalSize: 10_000_000_000,
          thresholdBytes: 5_000_000_000,
          directories: [createMockDirectoryEntry({ sizeBytes: 10_000_000_000 })],
        });
      });

      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().startScan();
      });

      expect(mockInvoke).toHaveBeenCalledWith("set_tray_icon", {
        totalSize: 0,
        threshold: 5_000_000_000,
      });

      const state = useDependencyStore.getState();
      expect(state.totalSize).toBe(0);
      expect(state.directories).toEqual([]);
    });
  });

  describe("cancelScan", () => {
    it("invokes cancel_scan and resets state", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      act(() => {
        useDependencyStore.setState({
          scanStatus: ScanStatus.SCANNING,
          currentScanPath: "/scanning/path",
        });
      });

      await act(async () => {
        await useDependencyStore.getState().cancelScan();
      });

      expect(mockInvoke).toHaveBeenCalledWith("cancel_scan");
      const state = useDependencyStore.getState();
      expect(state.scanStatus).toBe(ScanStatus.IDLE);
      expect(state.currentScanPath).toBeNull();
    });

    it("handles cancel_scan failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Cancel failed"));

      await act(async () => {
        await useDependencyStore.getState().cancelScan();
      });

      expect(mockInvoke).toHaveBeenCalledWith("cancel_scan");
    });
  });

  describe("deleteDirectory", () => {
    it("deletes directory and updates state on success", async () => {
      const entry = createMockDirectoryEntry({ path: "/project/node_modules", sizeBytes: 1000 });
      const deleteResult: DeleteResult = { success: true, path: entry.path, sizeFreed: 1000 };

      act(() => {
        useDependencyStore.setState({
          directories: [entry],
          totalSize: 1000,
        });
      });

      mockInvoke.mockResolvedValueOnce(deleteResult);
      mockInvoke.mockResolvedValueOnce(undefined);

      let result: DeleteResult | null = null;
      await act(async () => {
        result = await useDependencyStore.getState().deleteDirectory(entry.path);
      });

      expect(result).toEqual(deleteResult);
      expect(mockInvoke).toHaveBeenCalledWith("delete_to_trash", { path: entry.path });
      const state = useDependencyStore.getState();
      expect(state.directories).toEqual([]);
      expect(state.totalSize).toBe(0);
    });

    it("returns null if directory not found", async () => {
      let result: DeleteResult | null = null;
      await act(async () => {
        result = await useDependencyStore.getState().deleteDirectory("/nonexistent");
      });

      expect(result).toBeNull();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("does not remove directory from state on failure", async () => {
      const entry = createMockDirectoryEntry({ path: "/project/node_modules", sizeBytes: 1000 });
      const deleteResult: DeleteResult = { success: false, path: entry.path, sizeFreed: 0 };

      act(() => {
        useDependencyStore.setState({
          directories: [entry],
          totalSize: 1000,
        });
      });

      mockInvoke.mockResolvedValueOnce(deleteResult);

      await act(async () => {
        await useDependencyStore.getState().deleteDirectory(entry.path);
      });

      const state = useDependencyStore.getState();
      expect(state.directories).toHaveLength(1);
      expect(state.totalSize).toBe(1000);
    });

    it("returns error result when invoke throws", async () => {
      const entry = createMockDirectoryEntry({ path: "/project/node_modules", sizeBytes: 1000 });

      act(() => {
        useDependencyStore.setState({
          directories: [entry],
          totalSize: 1000,
        });
      });

      mockInvoke.mockRejectedValueOnce(new Error("Delete failed"));

      let result: DeleteResult | null = null;
      await act(async () => {
        result = await useDependencyStore.getState().deleteDirectory(entry.path);
      });

      expect(result).toEqual({
        success: false,
        path: entry.path,
        sizeFreed: 0,
      });
    });
  });

  describe("rescanDirectory", () => {
    it("removes directory when it no longer exists", async () => {
      const entry = createMockDirectoryEntry({ path: "/project/node_modules", sizeBytes: 1000 });
      const rescanResult: RescanResult = { exists: false, entry: null };

      act(() => {
        useDependencyStore.setState({
          directories: [entry],
          totalSize: 1000,
        });
      });

      mockInvoke.mockResolvedValueOnce(rescanResult);
      mockInvoke.mockResolvedValueOnce(undefined);

      let result: RescanResult | null = null;
      await act(async () => {
        result = await useDependencyStore.getState().rescanDirectory(entry.path);
      });

      expect(result).toEqual(rescanResult);
      expect(mockInvoke).toHaveBeenCalledWith("rescan_directory", { path: entry.path });
      const state = useDependencyStore.getState();
      expect(state.directories).toEqual([]);
      expect(state.totalSize).toBe(0);
    });

    it("updates directory when size changed", async () => {
      const entry = createMockDirectoryEntry({ path: "/project/node_modules", sizeBytes: 1000 });
      const updatedEntry = createMockDirectoryEntry({ path: "/project/node_modules", sizeBytes: 2000 });
      const rescanResult: RescanResult = { exists: true, entry: updatedEntry };

      act(() => {
        useDependencyStore.setState({
          directories: [entry],
          totalSize: 1000,
        });
      });

      mockInvoke.mockResolvedValueOnce(rescanResult);
      mockInvoke.mockResolvedValueOnce(undefined);

      let result: RescanResult | null = null;
      await act(async () => {
        result = await useDependencyStore.getState().rescanDirectory(entry.path);
      });

      expect(result).toEqual(rescanResult);
      const state = useDependencyStore.getState();
      expect(state.directories[0]!.sizeBytes).toBe(2000);
      expect(state.totalSize).toBe(2000);
    });

    it("returns null when invoke throws", async () => {
      const entry = createMockDirectoryEntry({ path: "/project/node_modules", sizeBytes: 1000 });

      act(() => {
        useDependencyStore.setState({
          directories: [entry],
          totalSize: 1000,
        });
      });

      mockInvoke.mockRejectedValueOnce(new Error("Rescan failed"));

      let result: RescanResult | null = null;
      await act(async () => {
        result = await useDependencyStore.getState().rescanDirectory(entry.path);
      });

      expect(result).toBeNull();
    });
  });

  describe("setThreshold", () => {
    it("updates threshold and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().setThreshold(5_000_000_000);
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          thresholdBytes: 5_000_000_000,
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.thresholdBytes).toBe(5_000_000_000);
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setThreshold(5_000_000_000);
      });

      const state = useDependencyStore.getState();
      expect(state.thresholdBytes).toBe(5_000_000_000);
    });
  });

  describe("setRootDirectory", () => {
    it("updates root directory and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().setRootDirectory("/Users/test");
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          rootDirectory: "/Users/test",
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.rootDirectory).toBe("/Users/test");
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setRootDirectory("/Users/test");
      });

      const state = useDependencyStore.getState();
      expect(state.rootDirectory).toBe("/Users/test");
    });
  });

  describe("setEnabledCategories", () => {
    it("updates categories and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const newCategories = [DependencyCategory.NODE_MODULES, DependencyCategory.PYTHON_VENV];

      await act(async () => {
        await useDependencyStore.getState().setEnabledCategories(newCategories);
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          enabledCategories: newCategories,
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.enabledCategories).toEqual(newCategories);
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setEnabledCategories([DependencyCategory.NODE_MODULES]);
      });

      const state = useDependencyStore.getState();
      expect(state.enabledCategories).toEqual([DependencyCategory.NODE_MODULES]);
    });
  });

  describe("toggleCategory", () => {
    it("disables an enabled category", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      act(() => {
        useDependencyStore.setState({
          enabledCategories: [...ALL_DEPENDENCY_CATEGORIES],
        });
      });

      await act(async () => {
        await useDependencyStore.getState().toggleCategory(DependencyCategory.NODE_MODULES);
      });

      const state = useDependencyStore.getState();
      expect(state.enabledCategories).not.toContain(DependencyCategory.NODE_MODULES);
    });

    it("enables a disabled category", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      act(() => {
        useDependencyStore.setState({
          enabledCategories: [DependencyCategory.PYTHON_VENV],
        });
      });

      await act(async () => {
        await useDependencyStore.getState().toggleCategory(DependencyCategory.NODE_MODULES);
      });

      const state = useDependencyStore.getState();
      expect(state.enabledCategories).toContain(DependencyCategory.NODE_MODULES);
      expect(state.enabledCategories).toContain(DependencyCategory.PYTHON_VENV);
    });

    it("prevents disabling all categories", async () => {
      act(() => {
        useDependencyStore.setState({
          enabledCategories: [DependencyCategory.NODE_MODULES],
        });
      });

      await act(async () => {
        await useDependencyStore.getState().toggleCategory(DependencyCategory.NODE_MODULES);
      });

      const state = useDependencyStore.getState();
      expect(state.enabledCategories).toEqual([DependencyCategory.NODE_MODULES]);
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("setMinSize", () => {
    it("updates min size and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().setMinSize(100_000_000);
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          minSizeBytes: 100_000_000,
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.minSizeBytes).toBe(100_000_000);
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setMinSize(100_000_000);
      });

      const state = useDependencyStore.getState();
      expect(state.minSizeBytes).toBe(100_000_000);
    });
  });

  describe("setPermanentDelete", () => {
    it("updates permanent delete and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().setPermanentDelete(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          permanentDelete: true,
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.permanentDelete).toBe(true);
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setPermanentDelete(true);
      });

      const state = useDependencyStore.getState();
      expect(state.permanentDelete).toBe(true);
    });
  });

  describe("setExcludePaths", () => {
    it("updates exclude paths and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().setExcludePaths("/path/to/exclude");
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          excludePaths: "/path/to/exclude",
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.excludePaths).toBe("/path/to/exclude");
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setExcludePaths("/path/to/exclude");
      });

      const state = useDependencyStore.getState();
      expect(state.excludePaths).toBe("/path/to/exclude");
    });
  });

  describe("setRescanInterval", () => {
    it("updates rescan interval and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().setRescanInterval(RescanInterval.ONE_HOUR);
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          rescanInterval: RescanInterval.ONE_HOUR,
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.rescanInterval).toBe(RescanInterval.ONE_HOUR);
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setRescanInterval(RescanInterval.ONE_HOUR);
      });

      const state = useDependencyStore.getState();
      expect(state.rescanInterval).toBe(RescanInterval.ONE_HOUR);
    });
  });

  describe("setConfirmBeforeDelete", () => {
    it("updates confirm before delete and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().setConfirmBeforeDelete(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          confirmBeforeDelete: true,
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.confirmBeforeDelete).toBe(true);
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setConfirmBeforeDelete(true);
      });

      const state = useDependencyStore.getState();
      expect(state.confirmBeforeDelete).toBe(true);
    });
  });

  describe("setNotifyOnThresholdExceeded", () => {
    it("updates notify on threshold exceeded and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().setNotifyOnThresholdExceeded(false);
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          notifyOnThresholdExceeded: false,
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.notifyOnThresholdExceeded).toBe(false);
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setNotifyOnThresholdExceeded(false);
      });

      const state = useDependencyStore.getState();
      expect(state.notifyOnThresholdExceeded).toBe(false);
    });
  });

  describe("setFontSize", () => {
    it("updates font size and saves settings", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useDependencyStore.getState().setFontSize(FontSize.LARGE);
      });

      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          fontSize: FontSize.LARGE,
        }),
      }));
      const state = useDependencyStore.getState();
      expect(state.fontSize).toBe(FontSize.LARGE);
    });

    it("handles save_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await act(async () => {
        await useDependencyStore.getState().setFontSize(FontSize.EXTRA_LARGE);
      });

      const state = useDependencyStore.getState();
      expect(state.fontSize).toBe(FontSize.EXTRA_LARGE);
    });
  });

  describe("selection management", () => {
    describe("toggleSelection", () => {
      it("adds path to selection when not selected", () => {
        const path = "/project/node_modules";

        act(() => {
          useDependencyStore.getState().toggleSelection(path);
        });

        const state = useDependencyStore.getState();
        expect(state.selectedPaths.has(path)).toBe(true);
      });

      it("removes path from selection when already selected", () => {
        const path = "/project/node_modules";

        act(() => {
          useDependencyStore.setState({
            selectedPaths: new Set([path]),
          });
        });

        act(() => {
          useDependencyStore.getState().toggleSelection(path);
        });

        const state = useDependencyStore.getState();
        expect(state.selectedPaths.has(path)).toBe(false);
      });

      it("handles multiple selections", () => {
        const path1 = "/project1/node_modules";
        const path2 = "/project2/node_modules";

        act(() => {
          useDependencyStore.getState().toggleSelection(path1);
          useDependencyStore.getState().toggleSelection(path2);
        });

        const state = useDependencyStore.getState();
        expect(state.selectedPaths.has(path1)).toBe(true);
        expect(state.selectedPaths.has(path2)).toBe(true);
        expect(state.selectedPaths.size).toBe(2);
      });
    });

    describe("clearSelection", () => {
      it("clears all selected paths", () => {
        act(() => {
          useDependencyStore.setState({
            selectedPaths: new Set(["/path1", "/path2", "/path3"]),
          });
        });

        act(() => {
          useDependencyStore.getState().clearSelection();
        });

        const state = useDependencyStore.getState();
        expect(state.selectedPaths.size).toBe(0);
      });

      it("does nothing when no paths selected", () => {
        act(() => {
          useDependencyStore.getState().clearSelection();
        });

        const state = useDependencyStore.getState();
        expect(state.selectedPaths.size).toBe(0);
      });
    });

    describe("selectAll", () => {
      it("selects all directories", () => {
        const entry1 = createMockDirectoryEntry({ path: "/project1/node_modules" });
        const entry2 = createMockDirectoryEntry({ path: "/project2/node_modules" });
        const entry3 = createMockDirectoryEntry({ path: "/project3/node_modules" });

        act(() => {
          useDependencyStore.setState({
            directories: [entry1, entry2, entry3],
          });
        });

        act(() => {
          useDependencyStore.getState().selectAll();
        });

        const state = useDependencyStore.getState();
        expect(state.selectedPaths.size).toBe(3);
        expect(state.selectedPaths.has(entry1.path)).toBe(true);
        expect(state.selectedPaths.has(entry2.path)).toBe(true);
        expect(state.selectedPaths.has(entry3.path)).toBe(true);
      });

      it("handles empty directories list", () => {
        act(() => {
          useDependencyStore.setState({
            directories: [],
          });
        });

        act(() => {
          useDependencyStore.getState().selectAll();
        });

        const state = useDependencyStore.getState();
        expect(state.selectedPaths.size).toBe(0);
      });
    });

    describe("deleteSelectedDirectories", () => {
      it("deletes all selected directories successfully", async () => {
        const entry1 = createMockDirectoryEntry({ path: "/project1/node_modules", sizeBytes: 1000 });
        const entry2 = createMockDirectoryEntry({ path: "/project2/node_modules", sizeBytes: 2000 });
        const entry3 = createMockDirectoryEntry({ path: "/project3/node_modules", sizeBytes: 3000 });

        act(() => {
          useDependencyStore.setState({
            directories: [entry1, entry2, entry3],
            totalSize: 6000,
            selectedPaths: new Set([entry1.path, entry2.path]),
          });
        });

        mockInvoke.mockResolvedValueOnce({ success: true, path: entry1.path, sizeFreed: 1000 });
        mockInvoke.mockResolvedValueOnce({ success: true, path: entry2.path, sizeFreed: 2000 });
        mockInvoke.mockResolvedValueOnce(undefined);

        await act(async () => {
          await useDependencyStore.getState().deleteSelectedDirectories();
        });

        const state = useDependencyStore.getState();
        expect(state.directories).toHaveLength(1);
        expect(state.directories[0]!.path).toBe(entry3.path);
        expect(state.totalSize).toBe(3000);
        expect(state.selectedPaths.size).toBe(0);
      });

      it("handles partial deletion failures", async () => {
        const entry1 = createMockDirectoryEntry({ path: "/project1/node_modules", sizeBytes: 1000 });
        const entry2 = createMockDirectoryEntry({ path: "/project2/node_modules", sizeBytes: 2000 });

        act(() => {
          useDependencyStore.setState({
            directories: [entry1, entry2],
            totalSize: 3000,
            selectedPaths: new Set([entry1.path, entry2.path]),
          });
        });

        mockInvoke.mockResolvedValueOnce({ success: true, path: entry1.path, sizeFreed: 1000 });
        mockInvoke.mockResolvedValueOnce({ success: false, path: entry2.path, sizeFreed: 0 });
        mockInvoke.mockResolvedValueOnce(undefined);

        await act(async () => {
          await useDependencyStore.getState().deleteSelectedDirectories();
        });

        const state = useDependencyStore.getState();
        expect(state.directories).toHaveLength(1);
        expect(state.directories[0]!.path).toBe(entry2.path);
        expect(state.totalSize).toBe(2000);
        expect(state.selectedPaths.size).toBe(0);
      });

      it("clears selection when all deletions fail", async () => {
        const entry1 = createMockDirectoryEntry({ path: "/project1/node_modules", sizeBytes: 1000 });

        act(() => {
          useDependencyStore.setState({
            directories: [entry1],
            totalSize: 1000,
            selectedPaths: new Set([entry1.path]),
          });
        });

        mockInvoke.mockRejectedValueOnce(new Error("Delete failed"));

        await act(async () => {
          await useDependencyStore.getState().deleteSelectedDirectories();
        });

        const state = useDependencyStore.getState();
        expect(state.directories).toHaveLength(1);
        expect(state.selectedPaths.size).toBe(0);
      });

      it("does nothing when no paths selected", async () => {
        const entry1 = createMockDirectoryEntry({ path: "/project1/node_modules", sizeBytes: 1000 });

        act(() => {
          useDependencyStore.setState({
            directories: [entry1],
            totalSize: 1000,
            selectedPaths: new Set(),
          });
        });

        await act(async () => {
          await useDependencyStore.getState().deleteSelectedDirectories();
        });

        expect(mockInvoke).not.toHaveBeenCalled();
        const state = useDependencyStore.getState();
        expect(state.directories).toHaveLength(1);
      });
    });
  });

  describe("loadSettings", () => {
    it("loads settings from backend", async () => {
      const mockSettings: AppSettings = {
        thresholdBytes: 5_000_000_000,
        rootDirectory: "/Users/test",
        enabledCategories: [DependencyCategory.NODE_MODULES],
        minSizeBytes: 1_000_000,
        permanentDelete: true,
        excludePaths: "/exclude",
        rescanInterval: RescanInterval.ONE_HOUR,
        confirmBeforeDelete: true,
        notifyOnThresholdExceeded: false,
        fontSize: FontSize.LARGE,
      };

      mockInvoke.mockResolvedValueOnce(mockSettings);

      await act(async () => {
        await useDependencyStore.getState().loadSettings();
      });

      expect(mockInvoke).toHaveBeenCalledWith("get_settings");
      const state = useDependencyStore.getState();
      expect(state.thresholdBytes).toBe(5_000_000_000);
      expect(state.rootDirectory).toBe("/Users/test");
      expect(state.enabledCategories).toEqual([DependencyCategory.NODE_MODULES]);
      expect(state.minSizeBytes).toBe(1_000_000);
      expect(state.permanentDelete).toBe(true);
      expect(state.excludePaths).toBe("/exclude");
      expect(state.rescanInterval).toBe(RescanInterval.ONE_HOUR);
      expect(state.confirmBeforeDelete).toBe(true);
      expect(state.notifyOnThresholdExceeded).toBe(false);
      expect(state.fontSize).toBe(FontSize.LARGE);
    });

    it("handles get_settings failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Load failed"));

      const stateBefore = useDependencyStore.getState();

      await act(async () => {
        await useDependencyStore.getState().loadSettings();
      });

      const stateAfter = useDependencyStore.getState();
      expect(stateAfter.thresholdBytes).toBe(stateBefore.thresholdBytes);
    });
  });

  describe("updateTrayIcon", () => {
    it("invokes set_tray_icon with totalSize and threshold when over threshold", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      act(() => {
        useDependencyStore.setState({
          totalSize: 20_000_000_000,
          thresholdBytes: 10_000_000_000,
        });
      });

      await act(async () => {
        await useDependencyStore.getState().updateTrayIcon();
      });

      expect(mockInvoke).toHaveBeenCalledWith("set_tray_icon", {
        totalSize: 20_000_000_000,
        threshold: 10_000_000_000,
      });
    });

    it("invokes set_tray_icon with totalSize and threshold when under threshold", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      act(() => {
        useDependencyStore.setState({
          totalSize: 5_000_000_000,
          thresholdBytes: 10_000_000_000,
        });
      });

      await act(async () => {
        await useDependencyStore.getState().updateTrayIcon();
      });

      expect(mockInvoke).toHaveBeenCalledWith("set_tray_icon", {
        totalSize: 5_000_000_000,
        threshold: 10_000_000_000,
      });
    });

    it("handles set_tray_icon failure gracefully", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Tray icon failed"));

      await act(async () => {
        await useDependencyStore.getState().updateTrayIcon();
      });

      expect(mockInvoke).toHaveBeenCalledWith("set_tray_icon", expect.any(Object));
    });
  });
});
