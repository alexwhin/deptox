import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFontSize } from "./useFontSize";
import { FontSize, ALL_FONT_SIZES } from "../types/fontSize";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

let mockFontSize: FontSize = FontSize.DEFAULT;

vi.mock("../stores/dependencyStore", () => ({
  useDependencyStore: (selector: (state: { fontSize: FontSize }) => FontSize) => {
    return selector({ fontSize: mockFontSize });
  },
}));

describe("useFontSize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFontSize = FontSize.DEFAULT;
    mockInvoke.mockResolvedValue(undefined);

    for (const size of ALL_FONT_SIZES) {
      document.documentElement.classList.remove(`font-size-${size}`);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();

    for (const size of ALL_FONT_SIZES) {
      document.documentElement.classList.remove(`font-size-${size}`);
    }
  });

  it("should add the current font size class to document.documentElement", () => {
    mockFontSize = FontSize.DEFAULT;
    renderHook(() => useFontSize());

    expect(document.documentElement.classList.contains("font-size-DEFAULT")).toBe(true);
  });

  it("should call resize_window with the font size", () => {
    mockFontSize = FontSize.DEFAULT;
    renderHook(() => useFontSize());

    expect(mockInvoke).toHaveBeenCalledWith("resize_window", { fontSize: FontSize.DEFAULT });
  });

  it("should apply LARGE font size class", () => {
    mockFontSize = FontSize.LARGE;
    renderHook(() => useFontSize());

    expect(document.documentElement.classList.contains("font-size-LARGE")).toBe(true);
    expect(document.documentElement.classList.contains("font-size-DEFAULT")).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith("resize_window", { fontSize: FontSize.LARGE });
  });

  it("should apply EXTRA_LARGE font size class", () => {
    mockFontSize = FontSize.EXTRA_LARGE;
    renderHook(() => useFontSize());

    expect(document.documentElement.classList.contains("font-size-EXTRA_LARGE")).toBe(true);
    expect(document.documentElement.classList.contains("font-size-DEFAULT")).toBe(false);
    expect(document.documentElement.classList.contains("font-size-LARGE")).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith("resize_window", { fontSize: FontSize.EXTRA_LARGE });
  });

  it("should remove all other font size classes when applying a new one", () => {
    document.documentElement.classList.add("font-size-DEFAULT");
    document.documentElement.classList.add("font-size-LARGE");

    mockFontSize = FontSize.EXTRA_LARGE;
    renderHook(() => useFontSize());

    expect(document.documentElement.classList.contains("font-size-EXTRA_LARGE")).toBe(true);
    expect(document.documentElement.classList.contains("font-size-DEFAULT")).toBe(false);
    expect(document.documentElement.classList.contains("font-size-LARGE")).toBe(false);
  });

  it("should handle invoke error gracefully", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInvoke.mockRejectedValue(new Error("Window resize failed"));

    mockFontSize = FontSize.DEFAULT;
    renderHook(() => useFontSize());

    expect(document.documentElement.classList.contains("font-size-DEFAULT")).toBe(true);
    consoleSpy.mockRestore();
  });

  it("should only have one font size class at a time", () => {
    mockFontSize = FontSize.LARGE;
    renderHook(() => useFontSize());

    const fontSizeClasses = ALL_FONT_SIZES.filter((size) =>
      document.documentElement.classList.contains(`font-size-${size}`)
    );

    expect(fontSizeClasses).toHaveLength(1);
    expect(fontSizeClasses[0]).toBe(FontSize.LARGE);
  });
});
