import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAnimationFrame } from "./useAnimationFrame";

describe("useAnimationFrame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      return setTimeout(() => callback(performance.now()), 16) as unknown as number;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("calls callback on next animation frame", () => {
    const callback = vi.fn();

    renderHook(() => useAnimationFrame({ callback }));

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(16);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not call callback when disabled", () => {
    const callback = vi.fn();

    renderHook(() => useAnimationFrame({ callback, enabled: false }));

    vi.advanceTimersByTime(16);

    expect(callback).not.toHaveBeenCalled();
  });

  it("cancels animation frame on unmount", () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => useAnimationFrame({ callback }));

    unmount();

    vi.advanceTimersByTime(16);

    expect(callback).not.toHaveBeenCalled();
  });

  it("re-runs when callback changes", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { rerender } = renderHook(
      ({ callback }) => useAnimationFrame({ callback }),
      { initialProps: { callback: callback1 } }
    );

    vi.advanceTimersByTime(16);
    expect(callback1).toHaveBeenCalledTimes(1);

    rerender({ callback: callback2 });

    vi.advanceTimersByTime(16);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it("re-runs when enabled changes from false to true", () => {
    const callback = vi.fn();

    const { rerender } = renderHook(
      ({ enabled }) => useAnimationFrame({ callback, enabled }),
      { initialProps: { enabled: false } }
    );

    vi.advanceTimersByTime(16);
    expect(callback).not.toHaveBeenCalled();

    rerender({ enabled: true });

    vi.advanceTimersByTime(16);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
