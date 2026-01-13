import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedCallback } from "./useDebouncedCallback";

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call callback immediately on trigger", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback({ callback, delayMs: 100 })
    );

    act(() => {
      result.current.trigger();
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("calls callback after delay", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback({ callback, delayMs: 100 })
    );

    act(() => {
      result.current.trigger();
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("resets timer on subsequent triggers", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback({ callback, delayMs: 100 })
    );

    act(() => {
      result.current.trigger();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    act(() => {
      result.current.trigger();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("cancels pending callback", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback({ callback, delayMs: 100 })
    );

    act(() => {
      result.current.trigger();
    });

    act(() => {
      result.current.cancel();
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("flush executes callback immediately and clears timer", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback({ callback, delayMs: 100 })
    );

    act(() => {
      result.current.trigger();
    });

    act(() => {
      result.current.flush();
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("flush does nothing when no pending callback", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback({ callback, delayMs: 100 })
    );

    act(() => {
      result.current.flush();
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("cancel does nothing when no pending callback", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback({ callback, delayMs: 100 })
    );

    act(() => {
      result.current.cancel();
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("uses latest callback reference", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback({ callback, delayMs: 100 }),
      { initialProps: { callback: callback1 } }
    );

    act(() => {
      result.current.trigger();
    });

    rerender({ callback: callback2 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it("cleans up timer on unmount", () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback({ callback, delayMs: 100 })
    );

    act(() => {
      result.current.trigger();
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("handles multiple trigger-cancel cycles", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback({ callback, delayMs: 100 })
    );

    for (let cycle = 0; cycle < 3; cycle++) {
      act(() => {
        result.current.trigger();
      });

      act(() => {
        result.current.cancel();
      });
    }

    act(() => {
      result.current.trigger();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("works with different delay values", () => {
    const callback = vi.fn();
    const { result, rerender } = renderHook(
      ({ delayMs }) => useDebouncedCallback({ callback, delayMs }),
      { initialProps: { delayMs: 50 } }
    );

    act(() => {
      result.current.trigger();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ delayMs: 200 });

    act(() => {
      result.current.trigger();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
