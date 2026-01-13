import { useEffect, useCallback, RefObject } from "react";

interface UseDialogKeyboardTrapOptions {
  dialogRef: RefObject<HTMLElement | null>;
  onEscape?: () => void;
  focusableSelector?: string;
  enabled?: boolean;
}

const DEFAULT_FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

export function useDialogKeyboardTrap({
  dialogRef,
  onEscape,
  focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
  enabled = true,
}: UseDialogKeyboardTrapOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === "Escape" && onEscape) {
        onEscape();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements =
          dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector);

        if (focusableElements.length === 0) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    },
    [dialogRef, onEscape, focusableSelector]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}
