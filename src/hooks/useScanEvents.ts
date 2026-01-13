import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useDependencyStore } from "../stores/dependencyStore";
import type { DirectoryEntry, ScanResult, ScanStats } from "../types/interfaces";
import { eventsLogger } from "../utilities/logger";

export function useScanEvents(): void {
  useEffect(() => {
    eventsLogger.log("Setting up event listeners");
    let unlistenEntry: UnlistenFn | undefined;
    let unlistenStats: UnlistenFn | undefined;
    let unlistenComplete: UnlistenFn | undefined;
    let unlistenCancelled: UnlistenFn | undefined;
    let unlistenError: UnlistenFn | undefined;
    let entryCount = 0;
    let statsCount = 0;

    const setupListeners = async (): Promise<void> => {
      eventsLogger.debug("Registering scan_entry listener");
      unlistenEntry = await listen<DirectoryEntry>("scan_entry", (event) => {
        entryCount++;
        eventsLogger.debug(
          `scan_entry #${entryCount}: ${event.payload.path} ` +
          `(size=${event.payload.sizeBytes}, files=${event.payload.fileCount})`
        );
        useDependencyStore.getState().addDirectory(event.payload);
      });

      eventsLogger.debug("Registering scan_stats listener");
      unlistenStats = await listen<ScanStats>("scan_stats", (event) => {
        statsCount++;
        if (statsCount % 100 === 1) {
          eventsLogger.debug(`scan_stats #${statsCount}: ${event.payload.currentPath}`);
        }
        useDependencyStore.getState().updateScanStats({
          totalSize: event.payload.totalSize,
          currentPath: event.payload.currentPath,
        });
      });

      eventsLogger.debug("Registering scan_complete listener");
      unlistenComplete = await listen<ScanResult>("scan_complete", (event) => {
        eventsLogger.log(`Scan complete: ${event.payload.entries.length} entries, ${event.payload.scanTimeMs}ms`);
        const samplesToLog = event.payload.entries.slice(0, 5);
        for (const entry of samplesToLog) {
          eventsLogger.debug(
            `  Entry: ${entry.path} (size=${entry.sizeBytes}, files=${entry.fileCount})`
          );
        }
        useDependencyStore.getState().setScanComplete(event.payload);
      });

      eventsLogger.debug("Registering scan_cancelled listener");
      unlistenCancelled = await listen<void>("scan_cancelled", () => {
        eventsLogger.log("Scan cancelled");
        useDependencyStore.getState().setScanCancelled();
      });

      eventsLogger.debug("Registering scan_error listener");
      unlistenError = await listen<string>("scan_error", (event) => {
        eventsLogger.error(`Scan error: ${event.payload}`);
        useDependencyStore.getState().setScanError(event.payload);
      });

      eventsLogger.log("All listeners registered");
    };

    setupListeners();

    return () => {
      eventsLogger.debug(`Cleaning up listeners (received ${entryCount} entries, ${statsCount} stats)`);
      /* v8 ignore start -- guards for cleanup before async setup completes */
      if (unlistenEntry) {
        unlistenEntry();
      }
      if (unlistenStats) {
        unlistenStats();
      }
      if (unlistenComplete) {
        unlistenComplete();
      }
      if (unlistenCancelled) {
        unlistenCancelled();
      }
      if (unlistenError) {
        unlistenError();
      }
      /* v8 ignore stop */
    };
  }, []);
}
