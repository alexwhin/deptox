import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

interface EventListener<T = unknown> {
  event: string;
  handler: (payload: T) => void | Promise<void>;
}

export function useTauriListener<T = unknown>(
  event: string,
  handler: (payload: T) => void | Promise<void>,
  dependencies: React.DependencyList = []
): void {
  useEffect(() => {
    let cleanup: UnlistenFn | undefined;

    const setupListener = async (): Promise<void> => {
      cleanup = await listen<T>(event, (eventData) => {
        handler(eventData.payload);
      });
    };

    setupListener();

    return () => {
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...dependencies]);
}

export function useTauriListeners<T extends Record<string, unknown>>(
  listeners: EventListener<T[keyof T]>[],
  dependencies: React.DependencyList = []
): void {
  useEffect(() => {
    let cleanups: UnlistenFn[] = [];

    const setupListeners = async (): Promise<void> => {
      const promises = listeners.map(async ({ event, handler }) => {
        const unlisten = await listen(event, (eventData) => {
          handler(eventData.payload as T[keyof T]);
        });
        return unlisten;
      });

      cleanups = await Promise.all(promises);
    };

    setupListeners();

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
