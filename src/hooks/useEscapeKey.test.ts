import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEscapeKey } from "./useEscapeKey";

describe("useEscapeKey", () => {
  const dispatchKeydown = (key: string): void => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call onEscape when Escape key is pressed", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey({ onEscape }));

    dispatchKeydown("Escape");

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("should not call onEscape for other keys", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey({ onEscape }));

    dispatchKeydown("Enter");
    dispatchKeydown("Tab");
    dispatchKeydown("a");

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("should not call onEscape when disabled", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey({ onEscape, enabled: false }));

    dispatchKeydown("Escape");

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("should call onEscape when enabled is true", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey({ onEscape, enabled: true }));

    dispatchKeydown("Escape");

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("should remove event listener on unmount", () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey({ onEscape }));

    unmount();
    dispatchKeydown("Escape");

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("should handle enabled changing from false to true", () => {
    const onEscape = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useEscapeKey({ onEscape, enabled }),
      { initialProps: { enabled: false } }
    );

    dispatchKeydown("Escape");
    expect(onEscape).not.toHaveBeenCalled();

    rerender({ enabled: true });
    dispatchKeydown("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("should handle enabled changing from true to false", () => {
    const onEscape = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useEscapeKey({ onEscape, enabled }),
      { initialProps: { enabled: true } }
    );

    dispatchKeydown("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    dispatchKeydown("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("should use updated onEscape callback", () => {
    const onEscape1 = vi.fn();
    const onEscape2 = vi.fn();

    const { rerender } = renderHook(
      ({ onEscape }) => useEscapeKey({ onEscape }),
      { initialProps: { onEscape: onEscape1 } }
    );

    dispatchKeydown("Escape");
    expect(onEscape1).toHaveBeenCalledTimes(1);
    expect(onEscape2).not.toHaveBeenCalled();

    rerender({ onEscape: onEscape2 });
    dispatchKeydown("Escape");
    expect(onEscape1).toHaveBeenCalledTimes(1);
    expect(onEscape2).toHaveBeenCalledTimes(1);
  });

  it("should default enabled to true", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey({ onEscape }));

    dispatchKeydown("Escape");

    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});
