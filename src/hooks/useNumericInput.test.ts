import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNumericInput } from "./useNumericInput";

describe("useNumericInput", () => {
  it("initializes with the provided value", () => {
    const { result } = renderHook(() =>
      useNumericInput({
        initialValue: 10,
        onPersist: vi.fn(),
      })
    );

    expect(result.current.value).toBe(10);
  });

  it("updates value on valid change", () => {
    const { result } = renderHook(() =>
      useNumericInput({
        initialValue: 10,
        onPersist: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange({
        target: { value: "25" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe(25);
  });

  it("does not update value for non-numeric input", () => {
    const { result } = renderHook(() =>
      useNumericInput({
        initialValue: 10,
        onPersist: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange({
        target: { value: "abc" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe(10);
  });

  it("does not update value below minValue", () => {
    const { result } = renderHook(() =>
      useNumericInput({
        initialValue: 10,
        minValue: 5,
        onPersist: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange({
        target: { value: "3" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe(10);
  });

  it("calls onPersist with current value on blur", async () => {
    const handlePersist = vi.fn();
    const { result } = renderHook(() =>
      useNumericInput({
        initialValue: 10,
        onPersist: handlePersist,
      })
    );

    act(() => {
      result.current.handleChange({
        target: { value: "20" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleBlur();
    });

    expect(handlePersist).toHaveBeenCalledWith(20);
  });

  it("blurs input on Enter key", () => {
    const { result } = renderHook(() =>
      useNumericInput({
        initialValue: 10,
        onPersist: vi.fn(),
      })
    );

    const blurMock = vi.fn();
    const event = {
      key: "Enter",
      currentTarget: { blur: blurMock },
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(blurMock).toHaveBeenCalled();
  });

  it("does not blur on other keys", () => {
    const { result } = renderHook(() =>
      useNumericInput({
        initialValue: 10,
        onPersist: vi.fn(),
      })
    );

    const blurMock = vi.fn();
    const event = {
      key: "Tab",
      currentTarget: { blur: blurMock },
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(blurMock).not.toHaveBeenCalled();
  });

  it("allows values at minValue boundary", () => {
    const { result } = renderHook(() =>
      useNumericInput({
        initialValue: 10,
        minValue: 5,
        onPersist: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange({
        target: { value: "5" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe(5);
  });
});
