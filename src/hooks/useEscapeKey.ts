import { useEffect, useCallback } from "react";

interface UseEscapeKeyOptions {
  onEscape: () => void;
  enabled?: boolean;
}

export function useEscapeKey({
  onEscape,
  enabled = true,
}: UseEscapeKeyOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onEscape();
      }
    },
    [onEscape]
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
