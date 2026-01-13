import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDialogKeyboardTrap } from "./useDialogKeyboardTrap";
import { RefObject } from "react";

describe("useDialogKeyboardTrap", () => {
  let mockDialogElement: HTMLDivElement;
  let mockButton1: HTMLButtonElement;
  let mockButton2: HTMLButtonElement;
  let mockButton3: HTMLButtonElement;

  beforeEach(() => {
    mockDialogElement = document.createElement("div");
    mockButton1 = document.createElement("button");
    mockButton2 = document.createElement("button");
    mockButton3 = document.createElement("button");

    mockButton1.textContent = "Button 1";
    mockButton2.textContent = "Button 2";
    mockButton3.textContent = "Button 3";

    mockDialogElement.appendChild(mockButton1);
    mockDialogElement.appendChild(mockButton2);
    mockDialogElement.appendChild(mockButton3);

    document.body.appendChild(mockDialogElement);
  });

  afterEach(() => {
    document.body.removeChild(mockDialogElement);
  });

  it("calls onEscape when Escape key is pressed", () => {
    const onEscape = vi.fn();
    const dialogRef: RefObject<HTMLDivElement> = { current: mockDialogElement };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        onEscape,
      })
    );

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(escapeEvent);

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("traps focus when Tab is pressed on last element", () => {
    const dialogRef: RefObject<HTMLDivElement> = { current: mockDialogElement };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        focusableSelector: "button",
      })
    );

    mockButton3.focus();
    expect(document.activeElement).toBe(mockButton3);

    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(tabEvent, "preventDefault");

    document.dispatchEvent(tabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(mockButton1);
  });

  it("traps focus when Shift+Tab is pressed on first element", () => {
    const dialogRef: RefObject<HTMLDivElement> = { current: mockDialogElement };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        focusableSelector: "button",
      })
    );

    mockButton1.focus();
    expect(document.activeElement).toBe(mockButton1);

    const shiftTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(shiftTabEvent, "preventDefault");

    document.dispatchEvent(shiftTabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(mockButton3);
  });

  it("allows normal Tab navigation between elements", () => {
    const dialogRef: RefObject<HTMLDivElement> = { current: mockDialogElement };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        focusableSelector: "button",
      })
    );

    mockButton2.focus();
    expect(document.activeElement).toBe(mockButton2);

    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(tabEvent, "preventDefault");

    document.dispatchEvent(tabEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it("does not trap focus when enabled is false", () => {
    const onEscape = vi.fn();
    const dialogRef: RefObject<HTMLDivElement> = { current: mockDialogElement };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        onEscape,
        enabled: false,
      })
    );

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(escapeEvent);

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("removes event listener on unmount", () => {
    const onEscape = vi.fn();
    const dialogRef: RefObject<HTMLDivElement> = { current: mockDialogElement };

    const { unmount } = renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        onEscape,
      })
    );

    unmount();

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(escapeEvent);

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("handles dialog with no focusable elements gracefully", () => {
    const emptyDialog = document.createElement("div");
    document.body.appendChild(emptyDialog);

    const dialogRef: RefObject<HTMLDivElement> = { current: emptyDialog };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        focusableSelector: "button",
      })
    );

    const tabEvent = new KeyboardEvent("keydown", { key: "Tab" });
    const preventDefaultSpy = vi.spyOn(tabEvent, "preventDefault");

    document.dispatchEvent(tabEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();

    document.body.removeChild(emptyDialog);
  });

  it("uses custom focusable selector", () => {
    const customDialog = document.createElement("div");
    const input = document.createElement("input");
    const link = document.createElement("a");
    link.href = "#";

    customDialog.appendChild(input);
    customDialog.appendChild(link);
    document.body.appendChild(customDialog);

    const dialogRef: RefObject<HTMLDivElement> = { current: customDialog };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        focusableSelector: "input, a[href]",
      })
    );

    link.focus();
    expect(document.activeElement).toBe(link);

    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(tabEvent, "preventDefault");

    document.dispatchEvent(tabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);

    document.body.removeChild(customDialog);
  });

  it("handles dialog with single focusable element", () => {
    const singleElementDialog = document.createElement("div");
    const button = document.createElement("button");
    singleElementDialog.appendChild(button);
    document.body.appendChild(singleElementDialog);

    const dialogRef: RefObject<HTMLDivElement> = {
      current: singleElementDialog,
    };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        focusableSelector: "button",
      })
    );

    button.focus();
    expect(document.activeElement).toBe(button);

    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(tabEvent, "preventDefault");

    document.dispatchEvent(tabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button);

    document.body.removeChild(singleElementDialog);
  });

  it("does not call onEscape when other keys are pressed", () => {
    const onEscape = vi.fn();
    const dialogRef: RefObject<HTMLDivElement> = { current: mockDialogElement };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
        onEscape,
      })
    );

    const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
    document.dispatchEvent(enterEvent);

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("works without onEscape callback", () => {
    const dialogRef: RefObject<HTMLDivElement> = { current: mockDialogElement };

    renderHook(() =>
      useDialogKeyboardTrap({
        dialogRef,
      })
    );

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });

    expect(() => {
      document.dispatchEvent(escapeEvent);
    }).not.toThrow();
  });
});
