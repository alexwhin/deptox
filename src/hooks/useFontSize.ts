import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useDependencyStore } from "../stores/dependencyStore";
import { ALL_FONT_SIZES } from "../types/fontSize";
import { appLogger } from "../utilities/logger";

export function useFontSize(): void {
  const fontSize = useDependencyStore((state) => state.fontSize);

  useEffect(() => {
    const htmlElement = document.documentElement;

    for (const size of ALL_FONT_SIZES) {
      htmlElement.classList.remove(`font-size-${size}`);
    }

    htmlElement.classList.add(`font-size-${fontSize}`);

    invoke("resize_window", { fontSize }).catch((error) => {
      appLogger.error("Failed to resize window:", error);
    });
  }, [fontSize]);
}
