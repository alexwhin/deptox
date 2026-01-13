import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTextInput } from "./useTextInput";

describe("useTextInput", () => {
  it("initializes with the provided value", () => {
    const { result } = renderHook(() =>
      useTextInput({
        initialValue: "initial",
        onPersist: vi.fn(),
      })
    );

    expect(result.current.value).toBe("initial");
  });

  it("updates value on change", () => {
    const { result } = renderHook(() =>
      useTextInput({
        initialValue: "initial",
        onPersist: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange({
        target: { value: "updated" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("updated");
  });

  it("calls onPersist with current value on blur", async () => {
    const handlePersist = vi.fn();
    const { result } = renderHook(() =>
      useTextInput({
        initialValue: "initial",
        onPersist: handlePersist,
      })
    );

    act(() => {
      result.current.handleChange({
        target: { value: "updated" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleBlur();
    });

    expect(handlePersist).toHaveBeenCalledWith("updated");
  });

  it("blurs input on Enter key", () => {
    const { result } = renderHook(() =>
      useTextInput({
        initialValue: "initial",
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
      useTextInput({
        initialValue: "initial",
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

  it("allows direct setValue for external updates", () => {
    const { result } = renderHook(() =>
      useTextInput({
        initialValue: "initial",
        onPersist: vi.fn(),
      })
    );

    act(() => {
      result.current.setValue("direct update");
    });

    expect(result.current.value).toBe("direct update");
  });

  it("handles empty string", () => {
    const { result } = renderHook(() =>
      useTextInput({
        initialValue: "initial",
        onPersist: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange({
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("");
  });
});
