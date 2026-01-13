import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScanEvents } from "./useScanEvents";
import { useDependencyStore } from "../stores/dependencyStore";
import { DependencyCategory } from "../types/dependencyCategory";
import type { DirectoryEntry, ScanResult, ScanStats } from "../types/interfaces";

type EventCallback<T> = (event: { payload: T }) => void;

const mockListeners: Record<string, EventCallback<unknown>> = {};
const mockUnlistenFns: Record<string, ReturnType<typeof vi.fn>> = {};

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((eventName: string, callback: EventCallback<unknown>) => {
    mockListeners[eventName] = callback;
    mockUnlistenFns[eventName] = vi.fn();
    return Promise.resolve(mockUnlistenFns[eventName]);
  }),
}));

vi.mock("../utilities/logger", () => ({
  eventsLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../stores/dependencyStore", () => ({
  useDependencyStore: {
    getState: vi.fn(() => ({
      addDirectory: vi.fn(),
      updateScanStats: vi.fn(),
      setScanComplete: vi.fn(),
      setScanCancelled: vi.fn(),
      setScanError: vi.fn(),
    })),
  },
}));

function createMockDirectoryEntry(overrides: Partial<DirectoryEntry> = {}): DirectoryEntry {
  return {
    path: "/test/project/node_modules",
    sizeBytes: 1024 * 1024,
    fileCount: 100,
    lastModifiedMs: Date.now(),
    category: DependencyCategory.NODE_MODULES,
    hasOnlySymlinks: false,
    ...overrides,
  };
}

describe("useScanEvents", () => {
  let mockStoreFns: {
    addDirectory: ReturnType<typeof vi.fn>;
    updateScanStats: ReturnType<typeof vi.fn>;
    setScanComplete: ReturnType<typeof vi.fn>;
    setScanCancelled: ReturnType<typeof vi.fn>;
    setScanError: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    for (const key of Object.keys(mockListeners)) {
      delete mockListeners[key];
    }
    for (const key of Object.keys(mockUnlistenFns)) {
      delete mockUnlistenFns[key];
    }

    mockStoreFns = {
      addDirectory: vi.fn(),
      updateScanStats: vi.fn(),
      setScanComplete: vi.fn(),
      setScanCancelled: vi.fn(),
      setScanError: vi.fn(),
    };

    vi.mocked(useDependencyStore.getState).mockReturnValue(mockStoreFns as unknown as ReturnType<typeof useDependencyStore.getState>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers all event listeners on mount", async () => {
    renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_entry"]).toBeDefined();
      expect(mockListeners["scan_stats"]).toBeDefined();
      expect(mockListeners["scan_complete"]).toBeDefined();
      expect(mockListeners["scan_cancelled"]).toBeDefined();
      expect(mockListeners["scan_error"]).toBeDefined();
    });
  });

  it("calls addDirectory when scan_entry event is received", async () => {
    renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_entry"]).toBeDefined();
    });

    const entry = createMockDirectoryEntry({ path: "/project/node_modules" });

    act(() => {
      mockListeners["scan_entry"]!({ payload: entry });
    });

    expect(mockStoreFns.addDirectory).toHaveBeenCalledWith(entry);
  });

  it("calls updateScanStats when scan_stats event is received", async () => {
    renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_stats"]).toBeDefined();
    });

    const stats: ScanStats = {
      totalSize: 5000,
      directoryCount: 10,
      currentPath: "/scanning/path",
    };

    act(() => {
      mockListeners["scan_stats"]!({ payload: stats });
    });

    expect(mockStoreFns.updateScanStats).toHaveBeenCalledWith({
      totalSize: 5000,
      currentPath: "/scanning/path",
    });
  });

  it("calls setScanComplete when scan_complete event is received", async () => {
    renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_complete"]).toBeDefined();
    });

    const result: ScanResult = {
      entries: [
        createMockDirectoryEntry({ path: "/p1/node_modules" }),
        createMockDirectoryEntry({ path: "/p2/node_modules" }),
      ],
      totalSize: 2048,
      skippedCount: 5,
      scanTimeMs: 150,
    };

    act(() => {
      mockListeners["scan_complete"]!({ payload: result });
    });

    expect(mockStoreFns.setScanComplete).toHaveBeenCalledWith(result);
  });

  it("calls setScanCancelled when scan_cancelled event is received", async () => {
    renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_cancelled"]).toBeDefined();
    });

    act(() => {
      mockListeners["scan_cancelled"]!({ payload: undefined });
    });

    expect(mockStoreFns.setScanCancelled).toHaveBeenCalled();
  });

  it("calls setScanError when scan_error event is received", async () => {
    renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_error"]).toBeDefined();
    });

    act(() => {
      mockListeners["scan_error"]!({ payload: "Scan failed: permission denied" });
    });

    expect(mockStoreFns.setScanError).toHaveBeenCalledWith("Scan failed: permission denied");
  });

  it("cleans up listeners on unmount", async () => {
    const { unmount } = renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_entry"]).toBeDefined();
      expect(mockListeners["scan_stats"]).toBeDefined();
      expect(mockListeners["scan_complete"]).toBeDefined();
      expect(mockListeners["scan_cancelled"]).toBeDefined();
      expect(mockListeners["scan_error"]).toBeDefined();
    });

    unmount();

    expect(mockUnlistenFns["scan_entry"]).toHaveBeenCalled();
    expect(mockUnlistenFns["scan_stats"]).toHaveBeenCalled();
    expect(mockUnlistenFns["scan_complete"]).toHaveBeenCalled();
    expect(mockUnlistenFns["scan_cancelled"]).toHaveBeenCalled();
    expect(mockUnlistenFns["scan_error"]).toHaveBeenCalled();
  });

  it("handles multiple scan_entry events", async () => {
    renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_entry"]).toBeDefined();
    });

    const entries = [
      createMockDirectoryEntry({ path: "/project1/node_modules" }),
      createMockDirectoryEntry({ path: "/project2/node_modules" }),
      createMockDirectoryEntry({ path: "/project3/node_modules" }),
    ];

    act(() => {
      for (const entry of entries) {
        mockListeners["scan_entry"]!({ payload: entry });
      }
    });

    expect(mockStoreFns.addDirectory).toHaveBeenCalledTimes(3);
    expect(mockStoreFns.addDirectory).toHaveBeenNthCalledWith(1, entries[0]);
    expect(mockStoreFns.addDirectory).toHaveBeenNthCalledWith(2, entries[1]);
    expect(mockStoreFns.addDirectory).toHaveBeenNthCalledWith(3, entries[2]);
  });

  it("handles multiple scan_stats events", async () => {
    renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_stats"]).toBeDefined();
    });

    act(() => {
      for (let index = 0; index < 5; index++) {
        mockListeners["scan_stats"]!({
          payload: {
            totalSize: index * 1000,
            currentPath: `/path${index}`,
          },
        });
      }
    });

    expect(mockStoreFns.updateScanStats).toHaveBeenCalledTimes(5);
  });

  it("does not throw when listeners are called after unmount setup", async () => {
    const { unmount } = renderHook(() => useScanEvents());

    await vi.waitFor(() => {
      expect(mockListeners["scan_entry"]).toBeDefined();
    });

    expect(() => unmount()).not.toThrow();
  });
});
