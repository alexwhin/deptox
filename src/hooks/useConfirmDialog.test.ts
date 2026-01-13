import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConfirmDialog } from "./useConfirmDialog";

describe("useConfirmDialog", () => {
  it("initializes with dialog closed", () => {
    const { result } = renderHook(() => useConfirmDialog());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.title).toBe("");
    expect(result.current.message).toBe("");
    expect(result.current.confirmLabel).toBe("Confirm");
    expect(result.current.cancelLabel).toBe("Cancel");
  });

  it("opens dialog with provided options", async () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.showConfirmDialog({
        title: "Test Title",
        message: "Test Message",
      });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.title).toBe("Test Title");
    expect(result.current.message).toBe("Test Message");
    expect(result.current.confirmLabel).toBe("Confirm");
    expect(result.current.cancelLabel).toBe("Cancel");
  });

  it("uses custom labels when provided", async () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.showConfirmDialog({
        title: "Delete Item",
        message: "Are you sure?",
        confirmLabel: "Delete",
        cancelLabel: "Keep",
      });
    });

    expect(result.current.confirmLabel).toBe("Delete");
    expect(result.current.cancelLabel).toBe("Keep");
  });

  it("resolves to true when confirmed", async () => {
    const { result } = renderHook(() => useConfirmDialog());

    let promise: Promise<boolean>;

    act(() => {
      promise = result.current.showConfirmDialog({
        title: "Confirm",
        message: "Please confirm",
      });
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleConfirm();
    });

    const resolvedValue = await promise!;

    expect(resolvedValue).toBe(true);
    expect(result.current.isOpen).toBe(false);
  });

  it("closes dialog and resets state on cancel", () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.showConfirmDialog({
        title: "Test",
        message: "Test message",
        confirmLabel: "Yes",
        cancelLabel: "No",
      });
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleCancel();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.title).toBe("");
    expect(result.current.message).toBe("");
    expect(result.current.confirmLabel).toBe("Confirm");
    expect(result.current.cancelLabel).toBe("Cancel");
  });

  it("closes dialog and resets state on confirm", () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.showConfirmDialog({
        title: "Test",
        message: "Test message",
      });
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleConfirm();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.title).toBe("");
    expect(result.current.message).toBe("");
  });

  it("can be opened multiple times", () => {
    const { result } = renderHook(() => useConfirmDialog());

    // First dialog
    act(() => {
      result.current.showConfirmDialog({
        title: "First",
        message: "First message",
      });
    });

    expect(result.current.title).toBe("First");

    act(() => {
      result.current.handleCancel();
    });

    expect(result.current.isOpen).toBe(false);

    // Second dialog
    act(() => {
      result.current.showConfirmDialog({
        title: "Second",
        message: "Second message",
      });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.title).toBe("Second");
    expect(result.current.message).toBe("Second message");
  });
});
