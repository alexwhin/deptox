import { useEffect } from "react";

interface UseAnimationFrameOptions {
  callback: () => void;
  enabled?: boolean;
}

export function useAnimationFrame({
  callback,
  enabled = true,
}: UseAnimationFrameOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const frameId = requestAnimationFrame(callback);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [callback, enabled]);
}
