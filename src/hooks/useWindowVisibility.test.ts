import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWindowVisibility, isWindowVisible } from "./useWindowVisibility";
import { getCurrentWindow } from "@tauri-apps/api/window";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(),
}));

vi.mock("../utilities/logger", () => ({
  storeLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockGetCurrentWindow = vi.mocked(getCurrentWindow);

describe("useWindowVisibility", () => {
  const mockUnlisten = vi.fn();
  let focusChangeCallback: ((event: { payload: boolean }) => void) | undefined;
  const mockWindow = {
    isVisible: vi.fn(),
    onFocusChanged: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    focusChangeCallback = undefined;
    mockWindow.onFocusChanged.mockImplementation(async (callback) => {
      focusChangeCallback = callback;
      return mockUnlisten;
    });
    mockGetCurrentWindow.mockReturnValue(mockWindow as never);
  });

  it("returns true initially", () => {
    mockWindow.isVisible.mockResolvedValue(true);

    const { result } = renderHook(() => useWindowVisibility());

    expect(result.current).toBe(true);
  });

  it("updates visibility state from initial check", async () => {
    mockWindow.isVisible.mockResolvedValue(false);

    const { result } = renderHook(() => useWindowVisibility());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("sets up focus change listener on mount", async () => {
    mockWindow.isVisible.mockResolvedValue(true);

    renderHook(() => useWindowVisibility());

    await waitFor(() => {
      expect(mockWindow.onFocusChanged).toHaveBeenCalledTimes(1);
    });
  });

  it("updates visibility when focus changes to true", async () => {
    mockWindow.isVisible.mockResolvedValue(false);

    const { result } = renderHook(() => useWindowVisibility());

    await waitFor(() => {
      expect(focusChangeCallback).toBeDefined();
    });

    focusChangeCallback!({ payload: true });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("updates visibility when focus changes to false", async () => {
    mockWindow.isVisible.mockResolvedValue(true);

    const { result } = renderHook(() => useWindowVisibility());

    await waitFor(() => {
      expect(focusChangeCallback).toBeDefined();
    });

    focusChangeCallback!({ payload: false });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("cleans up listener on unmount", async () => {
    mockWindow.isVisible.mockResolvedValue(true);

    const { unmount } = renderHook(() => useWindowVisibility());

    await waitFor(() => {
      expect(mockWindow.onFocusChanged).toHaveBeenCalledTimes(1);
    });

    unmount();

    await waitFor(() => {
      expect(mockUnlisten).toHaveBeenCalledTimes(1);
    });
  });

  it("handles errors gracefully and defaults to visible", async () => {
    mockWindow.isVisible.mockRejectedValue(new Error("Failed to check visibility"));

    const { result } = renderHook(() => useWindowVisibility());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});

describe("isWindowVisible", () => {
  const mockWindow = {
    isVisible: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentWindow.mockReturnValue(mockWindow as never);
  });

  it("returns true when window is visible", async () => {
    mockWindow.isVisible.mockResolvedValue(true);

    const result = await isWindowVisible();

    expect(result).toBe(true);
    expect(mockWindow.isVisible).toHaveBeenCalledTimes(1);
  });

  it("returns false when window is not visible", async () => {
    mockWindow.isVisible.mockResolvedValue(false);

    const result = await isWindowVisible();

    expect(result).toBe(false);
    expect(mockWindow.isVisible).toHaveBeenCalledTimes(1);
  });

  it("returns false on error", async () => {
    mockWindow.isVisible.mockRejectedValue(new Error("Failed to check visibility"));

    const result = await isWindowVisible();

    expect(result).toBe(false);
  });

  it("logs error when check fails", async () => {
    const error = new Error("Failed to check visibility");
    mockWindow.isVisible.mockRejectedValue(error);

    await isWindowVisible();

    const { storeLogger } = await import("../utilities/logger");
    expect(storeLogger.error).toHaveBeenCalledWith(
      "Failed to check window visibility:",
      error
    );
  });
});
