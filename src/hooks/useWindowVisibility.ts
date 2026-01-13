import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { storeLogger } from "../utilities/logger";

export function useWindowVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const window = getCurrentWindow();
    let unlistenFocus: (() => void) | undefined;

    const setupListeners = async (): Promise<void> => {
      try {
        const visible = await window.isVisible();
        setIsVisible(visible);

        unlistenFocus = await window.onFocusChanged(({ payload: focused }) => {
          setIsVisible(focused);
        });
      } catch (error) {
        storeLogger.error("Failed to setup window visibility listener:", error);
        setIsVisible(true);
      }
    };

    setupListeners();

    return () => {
      if (unlistenFocus) {
        unlistenFocus();
      }
    };
  }, []);

  return isVisible;
}

export async function isWindowVisible(): Promise<boolean> {
  try {
    const window = getCurrentWindow();
    return await window.isVisible();
  } catch (error) {
    storeLogger.error("Failed to check window visibility:", error);
    return false;
  }
}
