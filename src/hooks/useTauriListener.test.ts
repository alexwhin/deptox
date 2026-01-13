import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTauriListener, useTauriListeners } from "./useTauriListener";

// Mock the Tauri listen function
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

import { listen } from "@tauri-apps/api/event";

const mockListen = vi.mocked(listen);

describe("useTauriListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets up a listener on mount", () => {
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    const handler = vi.fn();
    renderHook(() => useTauriListener("test-event", handler));

    expect(mockListen).toHaveBeenCalledWith("test-event", expect.any(Function));
  });

  it("calls handler when event is received", async () => {
    const unlisten = vi.fn();
    let capturedHandler: ((event: { payload: string }) => void) | undefined;

    mockListen.mockImplementation(async (_event, handler) => {
      capturedHandler = handler as (event: { payload: string }) => void;
      return unlisten;
    });

    const handler = vi.fn();
    renderHook(() => useTauriListener<string>("test-event", handler));

    await vi.waitFor(() => {
      expect(capturedHandler).toBeDefined();
    });

    capturedHandler!({ payload: "test-data" });

    expect(handler).toHaveBeenCalledWith("test-data");
  });

  it("cleans up listener on unmount", async () => {
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    const handler = vi.fn();
    const { unmount } = renderHook(() => useTauriListener("test-event", handler));

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    unmount();

    await vi.waitFor(() => {
      expect(unlisten).toHaveBeenCalled();
    });
  });

  it("re-subscribes when event name changes", async () => {
    const unlisten1 = vi.fn();
    const unlisten2 = vi.fn();
    let callCount = 0;

    mockListen.mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? unlisten1 : unlisten2;
    });

    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ event }) => useTauriListener(event, handler),
      { initialProps: { event: "event-1" } }
    );

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("event-1", expect.any(Function));
    });

    rerender({ event: "event-2" });

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("event-2", expect.any(Function));
    });
  });
});

describe("useTauriListeners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets up multiple listeners on mount", () => {
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    renderHook(() =>
      useTauriListeners([
        { event: "event-1", handler: handler1 },
        { event: "event-2", handler: handler2 },
      ])
    );

    expect(mockListen).toHaveBeenCalledTimes(2);
    expect(mockListen).toHaveBeenCalledWith("event-1", expect.any(Function));
    expect(mockListen).toHaveBeenCalledWith("event-2", expect.any(Function));
  });

  it("calls handlers when events are received", async () => {
    const unlisten = vi.fn();
    const capturedHandlers: Map<string, (event: { payload: unknown }) => void> = new Map();

    mockListen.mockImplementation(async (event, handler) => {
      capturedHandlers.set(event as string, handler as (event: { payload: unknown }) => void);
      return unlisten;
    });

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    renderHook(() =>
      useTauriListeners([
        { event: "event-1", handler: handler1 },
        { event: "event-2", handler: handler2 },
      ])
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    capturedHandlers.get("event-1")!({ payload: "data-1" });
    capturedHandlers.get("event-2")!({ payload: "data-2" });

    expect(handler1).toHaveBeenCalledWith("data-1");
    expect(handler2).toHaveBeenCalledWith("data-2");
  });

  it("cleans up all listeners on unmount", async () => {
    const unlisten1 = vi.fn();
    const unlisten2 = vi.fn();
    let callCount = 0;

    mockListen.mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? unlisten1 : unlisten2;
    });

    const { unmount } = renderHook(() =>
      useTauriListeners([
        { event: "event-1", handler: vi.fn() },
        { event: "event-2", handler: vi.fn() },
      ])
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockListen).toHaveBeenCalledTimes(2);

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unlisten1).toHaveBeenCalled();
    expect(unlisten2).toHaveBeenCalled();
  });
});
